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
    pub(crate) fn allowed(self, month: u32) -> bool {
        match self {
            HourType::Build => month < 5,
            HourType::Learning => month >= 11,
            HourType::Demo => true,
            HourType::Offseason => month >= 5,
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
