use std::collections::HashSet;

use crate::prelude::*;

#[derive(Object, Serialize)]
#[oai(rename = "PresentQueryResponse")]
pub(super) struct QueryResponse {
    present: HashSet<String>,
    absent: HashSet<String>,
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
