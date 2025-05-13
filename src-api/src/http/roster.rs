use crate::prelude::*;
use chrono::{Datelike, Local, Utc};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "hour_type", rename_all = "lowercase")]
pub enum HourType {
    #[serde(rename = "build")]
    Build,
    #[serde(rename = "learning")]
    Learning,
    #[serde(rename = "demo")]
    Demo,
}

#[derive(Clone, Debug, Deserialize)]
pub struct RosterRequest {
    pub id: String,
    pub hour_type: HourType,
    #[serde(default)]
    pub force: bool,
}

#[derive(Clone, Copy, Serialize)]
pub struct RosterResponse {
    pub is_login: bool,
    pub needs_force: bool,
}

pub async fn record(
    RosterRequest {
        id,
        force,
        hour_type,
    }: RosterRequest,
    pg: &PgPool,
) -> Result<RosterResponse, RouteError> {
    if hour_type == HourType::Build && Local::now().naive_local().month() < 9 {
        return Err(RouteError::NoBuildHours);
    }

    let record = sqlx::query!(
        r#"
        SELECT id, sign_in FROM records
        WHERE student_id = $1 
            AND in_progress = true 
            AND hour_type = $2
        "#,
        id,
        hour_type as HourType,
    )
    .fetch_optional(pg)
    .await?;

    if let Some(record) = record {
        let dt = Utc::now().naive_utc();
        let diff = dt - record.sign_in;

        if (diff.num_minutes() < 3) && !force {
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
            INSERT INTO records (id, student_id, sign_in, hour_type)
            VALUES ($1, $2, NOW(), $3)
            "#,
            cuid2(),
            id,
            hour_type as HourType,
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
