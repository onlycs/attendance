use core::fmt;

use chrono::{Datelike, Local, Utc};
use utoipa::ToSchema;

use crate::prelude::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[sqlx(type_name = "hour_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum HourType {
    Build,
    Learning,
    Demo,
    Offseason,
}

impl HourType {
    pub(crate) fn allowed(self, month: u32) -> bool {
        match self {
            HourType::Build => month < 5,
            HourType::Learning => month >= 11,
            HourType::Demo => true,
            HourType::Offseason => month >= 5,
        }
    }

    pub(crate) fn when_invalid(self) -> &'static str {
        match self {
            HourType::Build => "after April",
            HourType::Learning => "before November",
            HourType::Demo => unreachable!(),
            HourType::Offseason => "before May",
        }
    }
}

impl fmt::Display for HourType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            HourType::Build => write!(f, "build"),
            HourType::Learning => write!(f, "learning"),
            HourType::Demo => write!(f, "demo"),
            HourType::Offseason => write!(f, "offseason"),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum RosterAction {
    Login,
    Logout,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
pub struct RosterRequest {
    pub id: String,
    pub kind: HourType,
    #[serde(default)]
    pub force: bool,
}

#[derive(Clone, Copy, Debug, Serialize, ToSchema)]
pub struct RosterResponse {
    pub action: RosterAction,
    pub denied: bool,
}

#[tracing::instrument(
    name = "roster::record",
    skip(pg),
    fields(
        id = %&id[..7],
        force = %force,
        hour_type = %hour_type,
    ),
    ret,
    err
)]
pub(super) async fn record(
    RosterRequest {
        id,
        force,
        kind: hour_type,
    }: RosterRequest,
    pg: &PgPool,
) -> Result<RosterResponse, RouteError> {
    let month = Local::now().month();

    if !hour_type.allowed(month) {
        return Err(RouteError::HourType { hour_type });
    }

    println!("{id}");

    let records = sqlx::query!(
        r#"
        SELECT id, in_progress, hour_type as "hour_type: HourType" FROM records
        WHERE student_id = $1
        "#,
        id,
    )
    .fetch_all(pg)
    .await?;

    println!("Records: {:#?}", records);

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
                action: RosterAction::Logout,
                denied: true,
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
            action: RosterAction::Logout,
            denied: false,
        })
    } else {
        sqlx::query!(
            r#"
            INSERT INTO records (id, student_id, sign_in, hour_type, in_progress)
            VALUES ($1, $2, NOW(), $3, true)
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

#[tracing::instrument(name = "roster::delete", skip(pg), err)]
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
