use totp_rs::{Algorithm, TOTP};

use crate::{auth::Claims, prelude::*};

#[derive(Object)]
pub(super) struct SwipeRequest {
    /// AKA: admin's ID, TOTP `account_name`
    issuer: String,
    totp: String,
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

#[derive(ApiResponse, ApiError)]
#[from(PermissionDeniedError)]
pub(super) enum SwipeError {
    /// The given hour type is not allowed at this time. See `/roster/allowed`.
    #[oai(status = 400)]
    #[construct(hour_type(HourType), "{source} hours are not allowed right now")]
    BadRequest(PlainText<String>),

    /// The provided TOTP is invalid
    #[oai(status = 401)]
    #[from(totp_rs::TotpUrlError, "Invalid TOTP")]
    #[construct("Invalid TOTP")]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    /// No student with the given ID exists
    #[oai(status = 404)]
    #[construct("Student not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(
    SwipeRequest {
        issuer,
        totp,
        sid_hashed,
        kind,
        force,
    }: SwipeRequest,
    pg: PgPool,
) -> Result<SwipeResponse, SwipeError> {
    let Some(secret) = sqlx::query!(
        r#"
        UPDATE otps
        SET expiry = NOW() + INTERVAL '15 minutes'
        WHERE expiry > NOW() AND admin_id = $1 AND hour_type = $2
        RETURNING secret
        "#,
        issuer,
        kind as HourType
    )
    .fetch_optional(&pg)
    .await?
    .map(|r| r.secret) else {
        return Err(SwipeError::unauthorized());
    };

    let verifier = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret)?;
    if !verifier.check_current(&totp).unwrap_or(false) {
        return Err(SwipeError::unauthorized());
    }

    let claims = Claims::new(issuer, Claims::EXPIRY, &pg).await?;
    claims.perms.assert(Permission::Roster)?;

    if !kind.allowed() {
        return Err(SwipeError::hour_type(kind));
    }

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

    let now = Local::now();

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

    let q = sqlx::query!(
        r#"
        INSERT INTO records (id, sid_hashed, hour_type, sign_in)
        SELECT $1, $2, $3, NOW()
        WHERE EXISTS (
            SELECT 1
            FROM students s
            WHERE s.id_hashed = $2
        )
        "#,
        cuid2(),
        sid_hashed,
        kind as HourType,
    )
    .execute(&pg)
    .await?;

    if q.rows_affected() == 0 {
        return Err(SwipeError::not_found());
    }

    Ok(SwipeResponse {
        action: SwipeAction::Login,
    })
}
