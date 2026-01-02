use chrono::Datelike;
use strum::{Display, EnumString};

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
    Enum,
    EnumString,
    Display,
    sqlx::Type,
)]
#[oai(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
#[sqlx(type_name = "hour_type", rename_all = "lowercase")]
pub(crate) enum HourType {
    Build,
    Learning,
    Demo,
    Offseason,
}

impl HourType {
    /// Check if this hour type is allowed in the given 1-based month.
    pub(crate) fn allowed(self) -> bool {
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

        match self {
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
        }
    }

    /// Get a human-readable string describing when this hour type is invalid.
    pub(crate) fn invalid_when(self) -> &'static str {
        match self {
            HourType::Build => "after April",
            HourType::Learning => "before November",
            HourType::Demo => unreachable!(),
            HourType::Offseason => "before May",
        }
    }
}
