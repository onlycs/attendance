use crate::prelude::*;

pub async fn hours(id: String, pg: &PgPool) -> Result<f64, RouteError> {
    let records = sqlx::query!(
        r#"
        SELECT sign_in, sign_out FROM records
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
