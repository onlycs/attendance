use crate::prelude::*;

pub async fn hours(id: String, pg: &PgPool) -> Result<(f64, f64), RouteError> {
    sqlx::query!(
        r#"
        DELETE FROM records
        WHERE sign_in - sign_out > INTERVAL '5 hours'
        "#
    )
    .execute(pg)
    .await?;

    let learning_days = sqlx::query!(
        r#"
        SELECT sign_in, sign_out 
        FROM records
        WHERE student_id = $1 
            AND sign_out IS NOT NULL 
            AND in_progress = false
            AND EXTRACT(MONTH FROM sign_in) <= 12
            AND EXTRACT(MONTH FROM sign_in) >= 9
        "#,
        id
    )
    .fetch_all(pg)
    .await?;

    let build_hours = sqlx::query!(
        r#"
        SELECT sign_in, sign_out FROM records
        WHERE student_id = $1 
            AND sign_out IS NOT NULL 
            AND in_progress = false
            AND EXTRACT(MONTH FROM sign_in) <= 5
            AND EXTRACT(MONTH FROM sign_in) >= 1
        "#,
        id
    )
    .fetch_all(pg)
    .await?;

    let mut learning_mins = 0.0;
    let mut build_mins = 0.0;

    for learning_day in learning_days {
        let sign_in = learning_day.sign_in;
        let sign_out = learning_day.sign_out.unwrap();
        let diff = sign_out.signed_duration_since(sign_in);
        let mins = diff.num_minutes();

        learning_mins += mins as f64;
    }

    for build_day in build_hours {
        let sign_in = build_day.sign_in;
        let sign_out = build_day.sign_out.unwrap();
        let diff = sign_out.signed_duration_since(sign_in);
        let mins = diff.num_minutes();

        build_mins += mins as f64;
    }

    Ok((learning_mins / 60.0, build_mins / 60.0))
}
