use crate::prelude::*;
use chrono::Utc;

#[derive(Debug, Deserialize)]
pub struct RosterRequest {
    pub id: String,
    #[serde(default)]
    pub force: bool,
}

#[derive(Serialize)]
pub struct RosterResponse {
    pub is_login: bool,
    pub needs_force: bool,
}

pub async fn record(
    RosterRequest { id, force }: RosterRequest,
    pg: &PgPool,
) -> Result<RosterResponse, RouteError> {
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
        let dt = Utc::now().naive_utc();
        let diff = dt - record.sign_in;

        if (diff.num_minutes() < 5) && !force {
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

pub async fn delete_expired(pg: &PgPool) -> Result<(), RouteError> {
    sqlx::query!(
        r#"
        DELETE FROM records
        WHERE
            in_progress = true or
            sign_out - sign_in >= INTERVAL '14 hours'
        "#
    )
    .execute(pg)
    .await?;

    Ok(())
}
