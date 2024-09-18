use std::collections::HashMap;

use crate::prelude::*;

pub async fn csv(pg: &PgPool) -> Result<String, RouteError> {
    let records = sqlx::query!(
        r#"
        SELECT * FROM records
        WHERE in_progress = false
        "#,
    )
    .fetch_all(pg)
    .await?;

    let names = sqlx::query!(
        r#"
        SELECT * FROM students
        "#,
    )
    .fetch_all(pg)
    .await?
    .into_iter()
    .map(|s| (s.id, s.name))
    .collect::<HashMap<i32, String>>();

    let mut minutes = HashMap::new();

    for record in records {
        let timein = record.sign_in;
        let timeout = record.sign_out.unwrap();
        let duration = timeout.signed_duration_since(timein);
        let new_minutes = duration.num_minutes();

        minutes
            .entry(record.student_id)
            .and_modify(|e| *e += new_minutes)
            .or_insert(new_minutes);
    }

    let mut csv = String::new();

    // Write the header
    csv.push_str("last, first, id, hours\n");

    for (id, minutes) in minutes {
        let name = names.get(&id).unwrap();
        let (first, last) = name.split_once(' ').unwrap();
        csv.push_str(&format!(
            "{}, {}, {}, {}\n",
            last,
            first,
            id,
            minutes as f64 / 60.0
        ));
    }

    Ok(csv)
}
