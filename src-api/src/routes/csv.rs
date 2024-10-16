use std::collections::HashMap;

use crate::prelude::*;

pub async fn csv(pg: &PgPool) -> Result<String, RouteError> {
    let records = sqlx::query!(
        r#"
        SELECT
            student_id,
            sign_in,
            sign_out
        FROM records
        WHERE in_progress = false 
            AND sign_out IS NOT NULL 
            AND sign_out < sign_in + INTERVAL '4 hours'
        "#
    )
    .fetch_all(pg)
    .await?;

    let mut hours = HashMap::new();
    let mut csv = String::from("id,hours\n");

    for record in records {
        let timein = record.sign_in;
        let timeout = record.sign_out.unwrap();
        let duration = timeout.signed_duration_since(timein);
        let mins = duration.num_minutes();

        hours
            .entry(record.student_id)
            .and_modify(|time| *time += mins)
            .or_insert(mins);
    }

    for (student_id, mins) in hours {
        let hours = mins as f64 / 60.0;
        csv.push_str(&format!("{},{}\n", student_id, hours));
    }

    Ok(csv)
}
