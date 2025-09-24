use actix_web::HttpRequest;
use chrono::{Days, TimeDelta};
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

pub(super) async fn login_start(pg: &PgPool) -> Result<LoginStartResponse, RouteError> {
    let auth_info = sqlx::query!(r#"SELECT salt, verifier FROM cryptstore"#)
        .fetch_one(pg)
        .await?;

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

    Ok(LoginStartResponse {
        salt: hex::encode(auth_info.salt),
        b: hex::encode(b_pub),
    })
}

pub(super) async fn login_finish(
    LoginFinishRequest { a, m1 }: LoginFinishRequest,
    pg: &PgPool,
) -> Result<LoginFinishResponse, RouteError> {
    let auth_info = sqlx::query!(r#"SELECT salt, verifier, b FROM cryptstore"#)
        .fetch_one(pg)
        .await?;

    let Some(b) = auth_info.b else {
        return Err(RouteError::BadAuth);
    };

    let server = SrpServer::<Sha512>::new(&G_2048);
    let v = server.process_reply(&b, &auth_info.verifier, &hex::decode(a)?)?;
    v.verify_client(&hex::decode(m1)?)?;

    let token = sqlx::query!(
        r#"
        SELECT token, created_at FROM tokens
        WHERE created_at > NOW() - INTERVAL '10 hours'
        "#
    )
    .fetch_optional(pg)
    .await?;

    if let Some(token) = token {
        debug!("Found usable token, returning...");

        let dt = token.created_at + TimeDelta::hours(10);
        let fmt = dt
            .and_utc()
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        Ok(LoginFinishResponse {
            token: token.token,
            expires: fmt,
            m2: hex::encode(v.proof()),
        })
    } else {
        debug!("Must generate new token, previous one was too old");

        let token = cuid2();

        sqlx::query!(
            r#"
            DELETE FROM tokens
            WHERE created_at <= NOW() - INTERVAL '10 hours'
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

        Ok(LoginFinishResponse {
            token,
            expires: fmt,
            m2: hex::encode(v.proof()),
        })
    }
}

pub(super) async fn check(token: String, pg: &PgPool) -> Result<bool, RouteError> {
    debug!("Got a token check request {}", sanitize(&token));

    if sqlx::query!(
        r#"
        SELECT token, created_at FROM tokens
        WHERE created_at > NOW() - INTERVAL '10 hours'
            AND token = $1
        "#,
        sanitize(&token)
    )
    .fetch_optional(pg)
    .await?
    .is_some()
    {
        Ok(true)
    } else {
        info!("Token check failed: invalid token");
        Err(RouteError::BadAuth)
    }
}

pub async fn check_throw(token: String, pg: &PgPool) -> Result<(), RouteError> {
    if let Ok(automation) = env::var("AUTOMATION_TOKEN")
        && bcrypt::verify(&token, &automation).unwrap_or(false)
    {
        return Ok(());
    }

    let token = sqlx::query!(
        r#"
        SELECT token FROM tokens
        WHERE token = $1
            AND created_at > NOW() - INTERVAL '10 hours'
        "#,
        token
    )
    .fetch_optional(pg)
    .await?;

    if token.is_none() {
        return Err(RouteError::BadAuth);
    }

    Ok(())
}

pub(super) fn parse_header(req: &HttpRequest) -> Result<String, RouteError> {
    let auth_header = req.headers().get("Authorization");

    let Some(auth) = auth_header else {
        return Err(RouteError::BadAuth);
    };

    Ok(auth
        .to_str()?
        .to_string()
        .replace("Bearer ", "")
        .replace("Basic ", ""))
}

fn sanitize(token: &str) -> String {
    token.replace("Bearer ", "")
}
