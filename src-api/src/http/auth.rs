use actix_web::HttpRequest;
use base64::Engine;
use chrono::Days;
use rand::{RngCore, rng};
use sha2::Sha512;
use srp::{groups::G_2048, server::SrpServer};

use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RegisterStartRequest {
    v: String,
    s: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RegisterFinish {
    data: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LoginStartResponse {
    pub salt: String,
    pub b: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LoginFinishRequest {
    a: String,
    m1: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LoginFinishResponse {
    m2: String,
    token: String,
    expires: String,
}

#[allow(dead_code)]
pub(super) async fn register_start(
    RegisterStartRequest { v, s }: RegisterStartRequest,
    pg: &PgPool,
) -> Result<RegisterFinish, RouteError> {
    let sbytes = hex::decode(s.trim_start_matches("0x"))?;
    let vbytes = hex::decode(v.trim_start_matches("0x"))?;

    sqlx::query!(
        r#"
        UPDATE cryptstore
        SET verifier = $1, salt = $2
        "#,
        vbytes,
        sbytes
    )
    .execute(pg)
    .await?;

    let encrypted = sqlx::query!(r#"SELECT student_data from cryptstore"#)
        .fetch_one(pg)
        .await?;

    Ok(RegisterFinish {
        data: encrypted.student_data,
    })
}

#[allow(dead_code)]
pub(super) async fn register_finish(
    RegisterFinish { data }: RegisterFinish,
    pg: &PgPool,
) -> Result<(), RouteError> {
    sqlx::query!(
        r#"
        UPDATE cryptstore
        SET student_data = $1
        "#,
        data
    )
    .execute(pg)
    .await?;

    Ok(())
}

#[tracing::instrument(name = "auth::login::start", skip(pg), err)]
pub(super) async fn login_start(pg: &PgPool) -> Result<LoginStartResponse, RouteError> {
    info!("Starting login flow");

    let auth_info = sqlx::query!(r#"SELECT salt, verifier FROM cryptstore"#)
        .fetch_one(pg)
        .await?;

    debug!(
        salt_len = auth_info.salt.len(),
        verifier_len = auth_info.verifier.len(),
        "SRP: Fetched authentication information"
    );

    let mut b = [0u8; 64];
    rng().fill_bytes(&mut b);

    let server = SrpServer::<Sha512>::new(&G_2048);
    let b_pub = server.compute_public_ephemeral(&b, &auth_info.verifier);

    sqlx::query!(
        r#"
        UPDATE cryptstore
        SET b = $1
        "#,
        &b
    )
    .execute(pg)
    .await?;

    debug!(
        b_len = b_pub.len(),
        "SRP: Created and updated random ephemeral"
    );

    Ok(LoginStartResponse {
        salt: hex::encode(auth_info.salt),
        b: hex::encode(b_pub),
    })
}

#[tracing::instrument(
    name = "auth::login::finish",
    skip(pg, a, m1),
    fields(
        a_length = a.len(),
        m1_length = m1.len(),
        token = tracing::field::Empty,
        expires = tracing::field::Empty,
    ),
    err
)]
pub(super) async fn login_finish(
    LoginFinishRequest { a, m1 }: LoginFinishRequest,
    pg: &PgPool,
) -> Result<LoginFinishResponse, RouteError> {
    info!("Finishing login flow");

    let auth_info = sqlx::query!(r#"SELECT salt, verifier, b FROM cryptstore"#)
        .fetch_one(pg)
        .await?;

    debug!(
        salt_len = auth_info.salt.len(),
        verifier_len = auth_info.verifier.len(),
        "SRP: Fetched authentication information"
    );

    let Some(b) = auth_info.b else {
        warn!("Login finish called without prior login_start - no 'b' value found");
        return Err(RouteError::BadAuth);
    };

    let server = SrpServer::<Sha512>::new(&G_2048);
    let v = server.process_reply(&b, &auth_info.verifier, &hex::decode(a)?)?;
    v.verify_client(&hex::decode(m1)?)?;

    info!("Successfully authenticated client");

    let token = cuid2();
    tracing::Span::current().record("token", &token.as_str());

    sqlx::query!(
        r#"
        DELETE FROM tokens
        WHERE created_at <= NOW() - INTERVAL '10 hours'
            OR last_used_at <= NOW() - INTERVAL '3 hours'
        "#
    )
    .execute(pg)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO tokens (token)
        VALUES ($1)
        "#,
        token
    )
    .execute(pg)
    .await?;

    let dt = chrono::Utc::now().naive_utc() + Days::new(7);
    let fmt = dt
        .and_utc()
        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

    tracing::Span::current().record("expires", &fmt.as_str());

    info!("Login finish completed successfully");

    Ok(LoginFinishResponse {
        token,
        expires: fmt,
        m2: hex::encode(v.proof()),
    })
}

#[tracing::instrument(name = "auth::deauthorize", skip(pg), err)]
pub(super) async fn deauthorize(token: String, pg: &PgPool) -> Result<(), RouteError> {
    sqlx::query!(
        r#"
        DELETE FROM tokens
        WHERE token = $1
        "#,
        token
    )
    .execute(pg)
    .await?;

    info!("Token deauthorized");

    Ok(())
}

#[tracing::instrument(name = "auth::check", skip(pg), ret, err)]
pub(super) async fn check(token: String, pg: &PgPool) -> Result<bool, RouteError> {
    let token = token.trim_start_matches("Bearer ");

    if sqlx::query!(
        r#"
        SELECT token, created_at FROM tokens
        WHERE created_at > NOW() - INTERVAL '10 hours'
            AND token = $1
        "#,
        token
    )
    .fetch_optional(pg)
    .await?
    .is_some()
    {
        Ok(true)
    } else {
        Err(RouteError::BadAuth)
    }
}

pub async fn check_throw(token: &str, pg: &PgPool) -> Result<(), RouteError> {
    if let Ok(automation) = env::var("AUTOMATION_TOKEN")
        && bcrypt::verify(token, &automation).unwrap_or(false)
    {
        return Ok(());
    }

    let res = sqlx::query!(
        r#"
        SELECT token FROM tokens
        WHERE token = $1
            AND created_at > NOW() - INTERVAL '10 hours'
            AND last_used_at > NOW() - INTERVAL '3 hours'
        "#,
        token
    )
    .fetch_optional(pg)
    .await?;

    if res.is_none() {
        return Err(RouteError::BadAuth);
    }

    sqlx::query!(
        r#"
        UPDATE tokens
        SET last_used_at = NOW()
        WHERE token = $1
        "#,
        token
    )
    .fetch_optional(pg)
    .await?;

    Ok(())
}

pub(super) fn parse_header(req: &HttpRequest) -> Result<String, RouteError> {
    let auth_header = req.headers().get("Authorization");

    let Some(auth) = auth_header else {
        return Err(RouteError::BadAuth);
    };

    let auth = auth.to_str()?.to_string();

    if auth.starts_with("Basic") {
        let pass = auth.trim_start_matches("Basic ");
        let engine = base64::engine::general_purpose::STANDARD;
        let decoded = engine
            .decode(pass.as_bytes())
            .map_err(|_| RouteError::BadAuth)?;

        let decoded = String::from_utf8(decoded).map_err(|_| RouteError::BadAuth)?;

        return Ok(decoded);
    }

    Ok(auth.replace("Bearer ", "").replace("Basic ", ""))
}
