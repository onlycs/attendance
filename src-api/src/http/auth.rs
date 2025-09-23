use actix_web::HttpRequest;
use chrono::{Days, TimeDelta};

use crate::prelude::*;

const DATEFMT: &str = "%a, %d %b %Y %H:%M:%S GMT";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TokenRequest {
    pub password: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TokenResponse {
    pub token: String,
    pub expires: String,
}

pub(super) async fn authorize(
    TokenRequest { password }: TokenRequest,
    pg: &PgPool,
) -> Result<TokenResponse, RouteError> {
    debug!("Got authentication request");

    let admin_bcrypt = sqlx::query!(r#"SELECT admin_bcrypt FROM cryptstore"#)
        .fetch_one(pg)
        .await?;

    if !bcrypt::verify(&password, &admin_bcrypt).unwrap_or(false) {
        info!("Authentication failed: invalid password");
        return Err(RouteError::InvalidToken);
    }

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

        let dt = token.created_at + TimeDelta::hours(12);
        let fmt = dt.format(DATEFMT).to_string();

        Ok(TokenResponse {
            token: token.token,
            expires: fmt,
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
        let fmt = dt.format(DATEFMT).to_string();

        Ok(TokenResponse {
            token,
            expires: fmt,
        })
    }
}

pub(super) async fn check(token: String, pg: &PgPool) -> Result<TokenResponse, RouteError> {
    debug!("Got a token check request {}", sanitize(&token));

    let token = sqlx::query!(
        r#"
        SELECT token, created_at FROM tokens
        WHERE created_at > NOW() - INTERVAL '10 hours'
            AND token = $1
        "#,
        sanitize(&token)
    )
    .fetch_optional(pg)
    .await?;

    if let Some(token) = token {
        let dt = token.created_at + Days::new(7);
        let fmt = dt.format(DATEFMT).to_string();

        Ok(TokenResponse {
            token: token.token,
            expires: fmt,
        })
    } else {
        info!("Token check failed: invalid token");
        Err(RouteError::InvalidToken)
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
        return Err(RouteError::InvalidToken);
    }

    Ok(())
}

pub(super) fn parse_header(req: &HttpRequest) -> Result<String, RouteError> {
    let auth_header = req.headers().get("Authorization");

    let Some(auth) = auth_header else {
        return Err(RouteError::NoAuth);
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
