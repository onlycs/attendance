use totp_rs::Secret;

use crate::prelude::*;

#[derive(Object)]
#[oai(rename = "TOTPRequest")]
pub(super) struct Request {
    hour_type: HourType,
}

#[derive(Object)]
#[oai(rename = "TOTPResponse")]
/// TOTP Generator Data
///
/// The following parameters are assumed:
/// * Algorithm: SHA1
/// * Digits: 6
/// * Step: 30 seconds
/// * Skew: 1 interval
pub(super) struct Response {
    /// Base32-encoded TOTP secret
    secret: String,
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    #[from(totp_rs::SecretParseError, "Failed to generate secret")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg))]
pub(super) async fn route(
    Request { hour_type }: Request,
    admin_id: String,
    pg: PgPool,
) -> Result<Response, Error> {
    let secret = match sqlx::query!(
        r#"
        UPDATE otps
        SET expiry = NOW() + INTERVAL '15 minutes'
        WHERE expiry > NOW() AND admin_id = $1 AND hour_type = $2
        RETURNING secret
        "#,
        admin_id,
        hour_type as HourType
    )
    .fetch_optional(&pg)
    .await?
    {
        Some(rec) => Secret::Raw(rec.secret),
        None => {
            let secret = Secret::generate_secret();
            let bytes = secret.to_bytes()?;

            sqlx::query!(
                r#"
                INSERT INTO otps (admin_id, secret, hour_type)
                VALUES ($1, $2, $3)
                ON CONFLICT (admin_id) DO UPDATE
                SET secret = EXCLUDED.secret,
                    expiry = NOW() + INTERVAL '15 minutes',
                    hour_type = EXCLUDED.hour_type
                "#,
                admin_id,
                bytes,
                hour_type as HourType
            )
            .execute(&pg)
            .await?;

            secret
        }
    };

    let Secret::Encoded(secret) = secret.to_encoded() else {
        unreachable!()
    };

    Ok(Response { secret })
}
