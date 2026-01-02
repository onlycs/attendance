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

        #[derive(Deserialize)]
        struct Champ {
            start_date: chrono::NaiveDateTime,
        }

        #[derive(Deserialize)]
        struct Season {
            #[serde(rename = "frcChampionships")]
            champs: Vec<Champ>,
        }

        let champ_date = async {
            use std::{
                sync::OnceLock,
                time::{Duration, Instant},
            };

            static CACHE: OnceLock<std::sync::Mutex<Option<(chrono::NaiveDate, Instant)>>> =
                OnceLock::new();
            const CACHE_DURATION: Duration = Duration::from_secs(7 * 24 * 60 * 60); // 1 week

            let cache = CACHE.get_or_init(|| std::sync::Mutex::new(None));
            let mut cache_guard = cache.lock().unwrap();

            if let Some((cached_date, cached_time)) = *cache_guard {
                if cached_time.elapsed() < CACHE_DURATION {
                    return Some(cached_date);
                }
            }

            let result = reqwest::Client::new()
                .get(format!("https://frc-api.firstinspires.org/v3.0/{year}"))
                .header(
                    "Authorization",
                    format!(
                        "Basic {}",
                        base64::encode(format!(
                            "{}:{}",
                            env::var("FRC_API_USER").ok()?,
                            env::var("FRC_API_KEY").ok()?
                        ))
                    ),
                )
                .send()
                .await
                .ok()?
                .error_for_status()
                .ok()?
                .json::<Season>()
                .await
                .ok()?
                .champs
                .into_iter()
                .max_by_key(|c| c.start_date)
                .map(|c| c.start_date.date());

            if let Some(date) = result {
                *cache_guard = Some((date, Instant::now()));
            }

            result
        }
        .await;

        Ok(match self {
            HourType::Build => {
                today >= kickoff_day // after kickoff
                    && champ_date.is_none_or(|champ| today <= champ) // before champs, if known
                    && today.month() <= 4 // if there is FRC in May, god help the future generations
            }
            HourType::Learning => {
                (today < kickoff_day || champ_date.is_none_or(|champ| today > champ)) // before kickoff or after champs
                    && today.month() >= 9 // most schools start in September
            }
            HourType::Demo => true,
            HourType::Offseason => {
                champ_date.is_none_or(|champ| today >= champ) // after champs, if known
                    && today.month() >= 5 // after April
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

#[tracing::instrument(name = "roster::allowed", err)]
pub(super) async fn allowed() -> Result<Vec<HourType>, RouteError> {
    let mut allowed = Vec::with_capacity(3);

    for hour_type in HourType::VARIANTS {
        if hour_type.allowed().await? {
            allowed.push(*hour_type);
        }
    }

    Ok(allowed)
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
