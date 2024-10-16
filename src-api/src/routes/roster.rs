use crate::prelude::*;

pub async fn roster(id: String, pg: &PgPool) -> Result<bool, RouteError> {
    let record = sqlx::query!(
        r#"
        SELECT id, sign_in FROM records
        WHERE student_id = $1 and in_progress = true
        "#,
        id
    )
    .fetch_optional(pg)
    .await?;

    if let Some(record) = record {
        sqlx::query!(
            r#"
            UPDATE records
            SET in_progress = false, sign_out = NOW()
            WHERE id = $1
            "#,
            record.id
        )
        .execute(pg)
        .await?;

        Ok(false)
    } else {
        sqlx::query!(
            r#"
            INSERT INTO records (id, student_id, sign_in)
            VALUES ($1, $2, NOW())
            "#,
            cuid2(),
            id
        )
        .execute(pg)
        .await?;

        Ok(true)
    }
}
