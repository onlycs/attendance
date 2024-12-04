use crate::{prelude::*, RosterResponse};
use chrono::Utc;

pub async fn roster(id: String, force: bool, pg: &PgPool) -> Result<RosterResponse, RouteError> {
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
        // get chrono utc now
        let dt = Utc::now().naive_utc();
        let diff = dt - record.sign_in;

        println!("{:?} {:?} {:?}", dt, record.sign_in, diff);

        if (diff.num_minutes() < 5) && !force {
            println!("less than 5 minutes");

            return Ok(RosterResponse {
                is_login: false,
                needs_force: true,
            });
        }

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

        Ok(RosterResponse {
            is_login: false,
            needs_force: false,
        })
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

        Ok(RosterResponse {
            is_login: true,
            needs_force: false,
        })
    }
}
