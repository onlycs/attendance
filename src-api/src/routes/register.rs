use super::exists;
use crate::prelude::*;

pub async fn register(uid: i32, name: String, pg: &PgPool) -> Result<(), RouteError> {
    if exists(uid, pg).await? {
        return Err(RouteError::UserExists);
    }

    sqlx::query!(
        r#"
        INSERT INTO students (id, name)
        VALUES ($1, $2)
        "#,
        uid,
        name
    )
    .execute(pg)
    .await?;

    Ok(())
}
