use crate::prelude::*;

pub async fn login(password: String, pg: &PgPool) -> Result<String, RouteError> {
    let hashed = sha256::digest(password.as_bytes());

    if hashed != env::var("ADMIN_HASH")? {
        return Err(RouteError::InvalidToken);
    }

    let token = sqlx::query!(
        r#"
        SELECT * FROM tokens
        WHERE created_at > NOW() - INTERVAL '5 hours'
        "#
    )
    .fetch_optional(pg)
    .await?;

    let token = if let Some(tkn) = token {
        tkn.token
    } else {
        let token = cuid2();

        sqlx::query!(
            r#"
            DELETE FROM tokens
            WHERE created_at <= NOW() - INTERVAL '5 hours'
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

        token
    };

    Ok(token)
}
