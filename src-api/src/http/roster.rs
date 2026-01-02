use core::fmt;

use actix_web::cookie::time::format_description::modifier::Hour;
use chrono::{Datelike, Local, Utc};
use strum::VariantArray;
use utoipa::ToSchema;

use crate::prelude::*;

#[derive(
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    Serialize,
    Deserialize,
    ToSchema,
    VariantArray,
    sqlx::Type,
)]
#[sqlx(type_name = "hour_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum HourType {
    Build,
    Learning,
    Demo,
    Offseason,
}

impl HourType {
    pub(crate) async fn allowed(self) -> Result<bool, RouteError> {
        // who tf knows when this will change but until first decides to give me an api
        // for ts its staying this way
        //
        // ok, so, to find the date of kickoff, we can use the fact that its always the
        // first saturday **unless** Jan 1st is a Thursday, Friday, or Saturday,
        // in which case its the second saturday

        // get new years day information
        let today = Local::now().date_naive();
        let year = today.year();
        let nyd = chrono::NaiveDate::from_ymd_opt(year, 1, 1).unwrap();
        let nydotw = nyd.weekday();

        // postpone iff nyd is thurs, fri, sat
        let postpone = nydotw.num_days_from_sunday() >= 4;
        let postpone = if postpone { 7 } else { 0 };

        // calculate kickoff day
        let days2sat = 6 - nydotw.days_since(chrono::Weekday::Sun);
        let kickoff_day = nyd + chrono::Duration::days(days2sat as i64 + postpone);

        Ok(match self {
            HourType::Build => {
                today >= kickoff_day // after kickoff
                    && today.month() <= 4 // if there is FRC in May, god help the future generations
            }
            HourType::Learning => {
                today < kickoff_day  // before kickoff
                    || today.month() >= 9 // most schools start in September
            }
            HourType::Demo => true,
            HourType::Offseason => {
                today.month() >= 5 // may or afterwards
                    && today.month() <= 11 // god help that one FRC team that runs offseason in December
            }
        })
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
    if !hour_type.allowed().await? {
        return Err(RouteError::HourType { hour_type });
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

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(super) struct AllowedResponse {
    allowed: Vec<HourType>,
}

#[tracing::instrument(name = "roster::allowed", err)]
pub(super) async fn allowed() -> Result<AllowedResponse, RouteError> {
    let mut allowed = Vec::with_capacity(3);

    for hour_type in HourType::VARIANTS {
        if hour_type.allowed().await? {
            allowed.push(*hour_type);
        }
    }

    Ok(AllowedResponse { allowed })
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
