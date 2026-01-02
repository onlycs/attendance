use std::collections::HashSet;

use chrono::Datelike;

use crate::prelude::*;

#[derive(Object)]
pub(super) struct SwipeRequest {
    sid_hashed: String,
    kind: HourType,
    #[oai(default)]
    force: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enum)]
pub(super) enum SwipeAction {
    Login,
    Logout,
    Denied,
}

#[derive(Object)]
pub(super) struct SwipeResponse {
    action: SwipeAction,
}

#[derive(Object, Serialize)]
#[oai(rename = "SwipeQueryResponse")]
pub(super) struct QueryResponse {
    present: HashSet<String>,
    absent: HashSet<String>,
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum SwipeError {
    #[oai(status = 400)]
    #[construct(hour_type(HourType), "{source} hours are not allowed {}", source.invalid_when())]
    BadRequest(PlainText<String>),

    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum QueryError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(
    SwipeRequest {
        sid_hashed,
        kind,
        force,
    }: SwipeRequest,
    pg: PgPool,
) -> Result<SwipeResponse, SwipeError> {
    let now = Local::now();
    let month = now.month();

    if !kind.allowed(month) {
        return Err(SwipeError::hour_type(kind));
    }

    // TODO: check if student exists when that route is done

    let records = sqlx::query!(
        r#"
        SELECT id, sign_in FROM records
        WHERE sid_hashed = $1
            AND hour_type = $2
            AND sign_out IS NULL
        "#,
        sid_hashed,
        kind as HourType,
    )
    .fetch_all(&pg)
    .await?;

    let record = records
        .into_iter()
        .find(|r| r.sign_in.and_local().date_naive() == now.date_naive());

    if let Some(record) = record {
        let dt = now - record.sign_in.and_local();

        if (dt.num_minutes() < 3) && !force {
            return Ok(SwipeResponse {
                action: SwipeAction::Denied,
            });
        }

        sqlx::query!(
            r#"
            UPDATE records
            SET sign_out = NOW()
            WHERE id = $1
            "#,
            record.id
        )
        .execute(&pg)
        .await?;

        return Ok(SwipeResponse {
            action: SwipeAction::Logout,
        });
    }

    sqlx::query!(
        r#"
        INSERT INTO records (id, sid_hashed, hour_type, sign_in)
        VALUES ($1, $2, $3, NOW())
        "#,
        cuid2(),
        sid_hashed,
        kind as HourType,
    )
    .execute(&pg)
    .await?;

    Ok(SwipeResponse {
        action: SwipeAction::Login,
    })
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn query(pg: PgPool) -> Result<QueryResponse, QueryError> {
    let records = sqlx::query!(
        r#"
        SELECT sid_hashed, sign_in FROM records
        WHERE sign_out IS NULL
        "#
    )
    .fetch_all(&pg)
    .await?;

    let students = sqlx::query!(r#"SELECT id_hashed FROM students"#)
        .fetch_all(&pg)
        .await?;

    let open_today = records.into_iter().filter(|r| {
        let sign_in_local = r.sign_in;
        sign_in_local.date_naive() == Local::now().date_naive()
    });

    let mut present = HashSet::new();

    for record in open_today {
        present.insert(record.sid_hashed);
    }

    let absent = students
        .into_iter()
        .map(|s| s.id_hashed)
        .filter(|sid_hashed| !present.contains(sid_hashed))
        .collect::<HashSet<_>>();

    Ok(QueryResponse { present, absent })
}
