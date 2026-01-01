use super::prelude::*;

#[derive(Debug, Object)]
#[oai(rename = "RegisterStartResponse")]
pub(super) struct StartResponse {
    k2: String,
}

#[derive(ApiResponse, ApiError)]
pub(super) enum StartError {
    #[oai(status = 401)]
    #[construct("Invalid or expired invite token")]
    BadInvite(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(Debug, Object)]
#[oai(rename = "RegisterFinishRequest")]
pub(super) struct FinishRequest {
    pub(super) token: String,
    k1e: String,
    username: String,
    v: String,
    s: String,
}

#[derive(ApiResponse, ApiError)]
pub(super) enum FinishError {
    #[oai(status = 400)]
    #[from(hex::FromHexError, "Invalid hex encoding")]
    BadRequest(PlainText<String>),

    #[oai(status = 401)]
    #[construct("Invalid or expired invite token")]
    BadInvite(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    #[from(serde_json::Error, "Deserialization error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn start(token: String, pg: PgPool) -> Result<StartResponse, StartError> {
    let invite = sqlx::query!(
        r#"
        SELECT k2, sid_hashed, permissions
        FROM invites
        WHERE id = $1 AND expiry > NOW()
        "#,
        token
    )
    .fetch_optional(&pg)
    .await?
    .ok_or(StartError::bad_invite())?;

    sqlx::query!(
        r#"
        INSERT INTO register_sessions (id, sid_hashed, permissions)
        VALUES ($1, $2, $3)
        "#,
        token,
        invite.sid_hashed,
        invite.permissions
    )
    .execute(&pg)
    .await?;

    tokio::spawn(async move {
        sqlx::query!(
            r#"
            DELETE FROM invites
            WHERE id = $1 OR expiry < NOW()
            "#,
            token
        )
        .execute(&pg)
        .await
        .log();
    });

    Ok(StartResponse { k2: invite.k2 })
}

#[tracing::instrument(skip(pg, v, s), err)]
pub(super) async fn finish(
    FinishRequest {
        token,
        k1e,
        username,
        v,
        s,
    }: FinishRequest,
    pg: PgPool,
) -> Result<(), FinishError> {
    let res = sqlx::query!(
        r#"
        SELECT sid_hashed, permissions FROM register_sessions
        WHERE id = $1 AND expiry > NOW()
        "#,
        token
    )
    .fetch_optional(&pg)
    .await?
    .ok_or(FinishError::bad_invite())?;

    let userid = cuid2();

    sqlx::query!(
        r#"
        INSERT INTO admins (id, sid_hashed, username, salt, verifier, k1e)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        userid,
        res.sid_hashed,
        username,
        hex::decode(s)?,
        hex::decode(v)?,
        k1e
    )
    .execute(&pg)
    .await?;

    serde_json::from_value::<jwt::Permissions>(res.permissions)?
        .create(&userid, &pg)
        .await?;

    tokio::spawn(async move {
        sqlx::query!(
            r#"
            DELETE FROM register_sessions
            WHERE id = $1 OR expiry < NOW()
            "#,
            token
        )
        .execute(&pg)
        .await
        .log();
    });

    Ok(())
}
