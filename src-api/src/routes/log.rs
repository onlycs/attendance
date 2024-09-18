use crate::prelude::*;

pub async fn log(uid: i32, pg: &PgPool) -> Result<(), RouteError> {
    let record = sqlx::query!(
        r#"
        SELECT * FROM records
        WHERE student_id = $1 and in_progress = true
        "#,
        uid
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
    } else {
        sqlx::query!(
            r#"
            INSERT INTO records (id, student_id, sign_in)
            VALUES ($1, $2, NOW())
            "#,
            cuid2(),
            uid
        )
        .execute(pg)
        .await?;
    }

    Ok(())
}
