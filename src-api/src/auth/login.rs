use super::prelude::*;

#[derive(Debug, Object)]
#[oai(rename = "LoginStartResponse")]
pub(super) struct StartResponse {
    session: String,
    salt: String,
    b: String,
}

#[derive(ApiResponse, ApiError)]
pub(super) enum StartError {
    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(Debug, Object)]
#[oai(rename = "LoginFinishRequest")]
pub(super) struct FinishRequest {
    session: String,
    a: String,
    m1: String,
}

#[derive(Debug, Object)]
#[oai(rename = "LoginFinishResponse")]
pub(super) struct FinishResponse {
    jwt: String,
    claims: jwt::Claims,
}

#[derive(ApiResponse, ApiError)]
pub(super) enum FinishError {
    #[oai(status = 401)]
    #[from(srp::types::SrpAuthError, "Authentication failed")]
    #[construct("Invalid username or password")]
    BadAuth(PlainText<String>),

    #[oai(status = 400)]
    #[from(hex::FromHexError, "Invalid hex encoding")]
    InvalidHex(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    #[from(jsonwebtoken::errors::Error, "JWT error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn start(username: String, pg: PgPool) -> Result<StartResponse, StartError> {
    info!("Starting login flow for user: {}", username);

    let srp = sqlx::query!(
        r#"
        SELECT id, salt, verifier FROM admins
        WHERE username = $1
        "#,
        username
    )
    .fetch_one(&pg)
    .await?;

    debug!(
        salt_len = srp.salt.len(),
        verifier_len = srp.verifier.len(),
        "Fetched SRP parameters from database"
    );

    let mut b = [0u8; 64];
    rng().fill_bytes(&mut b);

    let server = SrpServer::<Sha512>::new(&G_2048);
    let b_pub = server.compute_public_ephemeral(&b, &srp.verifier);

    let session_id = cuid2();

    sqlx::query!(
        r#"
        INSERT INTO login_sessions (id, user_id, b)
        VALUES ($1, $2, $3)
        "#,
        &session_id,
        srp.id,
        b.to_vec()
    )
    .execute(&pg)
    .await?;

    tokio::spawn(async move {
        if let Err(e) = sqlx::query!(
            r#"
            DELETE FROM login_sessions
            WHERE created_at < NOW() - INTERVAL '10 minutes'
            "#
        )
        .execute(&pg)
        .await
        {
            error!("Failed to delete expired login sessions: {}", e);
            return;
        }
    });

    Ok(StartResponse {
        session: session_id,
        salt: hex::encode(srp.salt),
        b: hex::encode(b_pub),
    })
}

#[tracing::instrument(skip(pg, a, m1), err)]
pub(super) async fn finish(
    FinishRequest { session, a, m1 }: FinishRequest,
    pg: PgPool,
) -> Result<FinishResponse, FinishError> {
    let srp = sqlx::query!(
        r#"
        SELECT srp.user_id, srp.b, a.username, a.salt, a.verifier
        FROM login_sessions srp
        JOIN admins a ON srp.user_id = a.id
        WHERE srp.id = $1 AND srp.created_at >= NOW() - INTERVAL '10 minutes'
        "#,
        session
    )
    .fetch_optional(&pg)
    .await?
    .ok_or(FinishError::bad_auth())?;

    debug!(
        user_id = srp.user_id,
        username = srp.username,
        salt_len = srp.salt.len(),
        verifier_len = srp.verifier.len(),
        "Fetched SRP session and user parameters from database"
    );

    let server = SrpServer::<Sha512>::new(&G_2048);
    let v = server.process_reply(&srp.b, &srp.verifier, &hex::decode(a)?)?;
    v.verify_client(&hex::decode(m1)?)?;

    info!(
        user_id = srp.user_id,
        username = srp.username,
        "Successfully authenticated client"
    );

    let claims = jwt::Claims::new(srp.user_id, jwt::Claims::EXPIRY, &pg).await?;
    let jwt = claims.sign()?;

    tokio::spawn(async move {
        if let Err(e) = sqlx::query!(
            r#"
            DELETE FROM login_sessions
            WHERE id = $1
            "#,
            session
        )
        .execute(&pg)
        .await
        {
            error!("Failed to delete used login session: {}", e);
            return;
        }
    });

    Ok(FinishResponse { jwt, claims })
}
