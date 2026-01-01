use super::prelude::*;

#[derive(Object)]
#[oai(rename = "InviteRequest")]
pub(super) struct Request {
    /// The hashed student ID to associate with this invite, if any.
    sid_hashed: Option<String>,
    /// Initial permissions to grant the user
    permissions: jwt::Permissions,
}

#[derive(Object)]
#[oai(rename = "InviteResponse")]
pub(super) struct Response {
    /// Temporary key to encrypt k1. Do NOT share this
    k2: String,
    /// Invite token. This goes in the link
    token: String,
}

#[derive(ApiResponse, ApiError, Debug)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    #[from(serde_json::Error, "Serialization error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument("auth::invite", skip(pg), err)]
pub(super) async fn route(
    Request {
        sid_hashed,
        permissions,
    }: Request,
    pg: PgPool,
) -> Result<Response, Error> {
    let token = cuid2();

    let mut k2 = [0u8; 64];
    rng().fill_bytes(&mut k2);
    let k2 = hex::encode(&k2);

    sqlx::query!(
        r#"
        INSERT INTO invites (id, k2, sid_hashed, permissions)
        VALUES ($1, $2, $3, $4)
        "#,
        token,
        k2,
        sid_hashed,
        serde_json::to_value(&permissions)?
    )
    .execute(&pg)
    .await?;

    Ok(Response { token, k2 })
}
