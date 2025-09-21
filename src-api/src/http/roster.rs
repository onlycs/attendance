use core::fmt;

use chrono::{Datelike, Local, Utc};

use crate::prelude::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Hash, sqlx::Type)]
#[sqlx(type_name = "hour_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum HourType {
    Build,
    Learning,
    Demo,
}

impl fmt::Display for HourType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            HourType::Build => write!(f, "build"),
            HourType::Learning => write!(f, "learning"),
            HourType::Demo => write!(f, "demo"),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RosterAction {
    Login,
    Logout,
}

#[derive(Clone, Debug, Deserialize)]
pub struct RosterRequest {
    pub id: String,
    pub kind: HourType,
    #[serde(default)]
    pub force: bool,
}

#[derive(Clone, Copy, Serialize)]
pub struct RosterResponse {
    pub action: RosterAction,
    pub denied: bool,
}

pub(super) async fn record(
    RosterRequest {
        id,
        force,
        kind: hour_type,
    }: RosterRequest,
    pg: &PgPool,
) -> Result<RosterResponse, RouteError> {
    debug!("Received roster request: {hour_type:?} hours for {id}");

    if hour_type == HourType::Build && Local::now().month() > 9 {
        warn!("Build hours are not available after September");
        return Err(RouteError::NoBuildHours);
    }

    if hour_type == HourType::Learning && Local::now().month() < 9 {
        warn!("Learning hours are not available before September");
        return Err(RouteError::NoLearningHours);
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
            info!("Logout denied: student {id} has been signed in for less than 3 minutes");

            return Ok(RosterResponse {
                action: RosterAction::Logout,
                denied: true,
            });
        }

        debug!("Logging out student {id}");

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
            action: RosterAction::Logout,
            denied: false,
        })
    } else {
        debug!("Logging in student {id}");

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
            action: RosterAction::Login,
            denied: false,
        })
    }
}

pub(super) async fn delete_expired(pg: &PgPool) -> Result<(), RouteError> {
    sqlx::query!(
        r#"
        DELETE FROM records
        WHERE in_progress = true
            OR sign_out - sign_in >= INTERVAL '14 hours'
        "#
    )
    .execute(pg)
    .await?;

    Ok(())
}
