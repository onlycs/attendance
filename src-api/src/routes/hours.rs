use crate::prelude::*;

pub async fn hours(name: String, id: i32, pg: &PgPool) -> Result<f64, RouteError> {
    let student = sqlx::query!(
        r#"
        SELECT * FROM students
        WHERE id = $1 and name = $2
        "#,
        id,
        name
    )
    .fetch_optional(pg)
    .await?;

    if student.is_none() {
        return Err(RouteError::UserExists);
    }

    let records = sqlx::query!(
        r#"
        SELECT * FROM records
        WHERE student_id = $1 
            AND sign_out IS NOT NULL 
            AND in_progress = false
        "#,
        id
    )
    .fetch_all(pg)
    .await?;

    let mut minutes = 0;

    for record in records {
        let timein = record.sign_in;
        let timeout = record.sign_out.unwrap();
        let duration = timeout.signed_duration_since(timein);
        let new_minutes = duration.num_minutes();

        minutes += new_minutes;
    }

    Ok(minutes as f64 / 60.0)
}
