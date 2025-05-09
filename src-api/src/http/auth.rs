use actix_web::HttpRequest;
use chrono::Days;

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

pub async fn authorize(
    TokenRequest { password }: TokenRequest,
    pg: &PgPool,
) -> Result<TokenResponse, RouteError> {
    info!("{password}");
    if !bcrypt::verify(&password, &env::var("ADMIN_CRYPT")?).unwrap_or(false) {
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

    let token = if let Some(token) = token {
        let dt = token.created_at + Days::new(7);
        let fmt = dt.format(DATEFMT).to_string();

        Ok(TokenResponse {
            token: token.token,
            expires: fmt,
        })
    } else {
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
    };

    token
}

pub async fn check(token: String, pg: &PgPool) -> Result<TokenResponse, RouteError> {
    let token = sqlx::query!(
        r#"
        SELECT token, created_at FROM tokens
        WHERE created_at > NOW() - INTERVAL '10 hours' and token = $1
        "#,
        token
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
        Err(RouteError::InvalidToken)
    }
}

pub async fn check_throw(token: String, pg: &PgPool) -> Result<(), RouteError> {
    let token = sqlx::query!(
        r#"
        SELECT token FROM tokens
        WHERE created_at > NOW() - INTERVAL '10 hours' and token = $1
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

pub fn parse_header(req: &HttpRequest) -> Result<String, RouteError> {
    let auth_header = req.headers().get("Authorization");

    let Some(auth) = auth_header else {
        return Err(RouteError::NoAuth);
    };

    Ok(auth.to_str()?.to_string())
}
