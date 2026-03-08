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
#[from(JwtVerifyError)]
pub(super) enum FinishError {
    /// Invalid hex encoding for `v` or `s`
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

#[derive(Debug, Object)]
pub(super) struct ReregisterRequest {
    k1e: String,
    v: String,
    s: String,
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn start(token: String, pg: PgPool) -> Result<StartResponse, StartError> {
    let invite = sqlx::query!(
        r#"
        SELECT k2, inviter_id, permissions
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
        INSERT INTO register_sessions (id, inviter_id, permissions)
        VALUES ($1, $2, $3)
        "#,
        token,
        invite.inviter_id,
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
        SELECT inviter_id, permissions FROM register_sessions
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
        INSERT INTO admins (id, username, salt, verifier, k1e)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        userid,
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

    let uid_telemetry = userid.clone();
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

        let Some(inviter) = res.inviter_id else {
            return;
        };

        telemeter(
            InviteUse {
                invitee_id: uid_telemetry,
                inviter_id: inviter,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(())
}

#[tracing::instrument(skip(pg, v, s), err)]
pub(super) async fn reregister(
    ReregisterRequest { k1e, v, s }: ReregisterRequest,
    uid: String,
    pg: PgPool,
) -> Result<(), FinishError> {
    sqlx::query!(
        r#"
        UPDATE admins
        SET salt = $2, verifier = $3, k1e = $4
        WHERE id = $1
        "#,
        uid,
        hex::decode(s)?,
        hex::decode(v)?,
        k1e
    )
    .execute(&pg)
    .await?;

    Ok(())
}
