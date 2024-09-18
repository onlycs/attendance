use crate::prelude::*;

pub async fn exists(uid: i32, pg: &PgPool) -> Result<bool, RouteError> {
    let record = sqlx::query!(
        r#"
        SELECT * FROM students
        WHERE id = $1
        "#,
        uid
    )
    .fetch_optional(pg)
    .await?;

    Ok(record.is_some())
}
