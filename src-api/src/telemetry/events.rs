use attendance_api_macro::declare_event_modules;

use crate::prelude::*;

macro_rules! migrator {
    (@migrate_all_after $data:ident) => {
        return $data.into()
    };

    (@migrate_all_after $data:ident $next:ident $($remainder:ident)*) => {
        let data: $next = $data.into();
        migrator!(@migrate_all_after data $($remainder)*);
    };

    (@arm $data:ident) => {};

    (@arm $data:ident $current:ident $($remainder:ident)*) => {
        if let Migrator::$current(data) = $data {
            migrator!(@migrate_all_after data $($remainder)*);
        }

        migrator!(@arm $data $($remainder)*);
    };

    ($latest:ident {
        $($instance:ident),* $(,)?
    }) => {
        #[derive(serde::Deserialize)]
        #[serde(untagged)]
        enum Migrator {
            $($instance($instance),)*
            Latest( $latest ),
        }

        impl From<Migrator> for $latest {
            fn from(data: Migrator) -> Self {
                migrator!(@arm data $($instance)*);
                let Migrator::Latest(data) = data;
                data
            }
        }

        pub(super) fn __deserialize<'de, D>(dser: D) -> Result<$latest, D::Error>
        where
            D: serde::Deserializer<'de>,
        {
            let migrator = Migrator::deserialize(dser)?;
            Ok(migrator.into())
        }
    };
}

declare_event_modules!();

pub(crate) trait EventSerializable {
    fn sql_pair(&self) -> Result<(EventType, serde_json::Value), serde_json::Error>;
}

#[derive(Debug, Clone, sqlx::FromRow, Deserialize)]
struct RawTelemetryEvent {
    id: String,
    event: EventType,
    data: serde_json::Value,
    timestamp: chrono::DateTime<Utc>,
}

#[derive(Deserialize, Debug, Clone, Object)]
#[serde(try_from = "RawTelemetryEvent")]
pub(crate) struct TelemetryEvent {
    pub id: String,
    pub event: Event,
    pub timestamp: chrono::DateTime<Utc>,
}

impl TryFrom<RawTelemetryEvent> for TelemetryEvent {
    type Error = serde_json::Error;

    fn try_from(raw: RawTelemetryEvent) -> Result<Self, Self::Error> {
        let evt = serde_json::json!({
            "event": raw.event,
            "data": raw.data,
        });

        Ok(TelemetryEvent {
            id: raw.id,
            event: serde_json::from_value(evt)?,
            timestamp: raw.timestamp,
        })
    }
}

impl sqlx::FromRow<'_, sqlx::postgres::PgRow> for TelemetryEvent {
    fn from_row(row: &sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        let raw: RawTelemetryEvent = sqlx::FromRow::from_row(row)?;
        raw.try_into().map_err(|e| sqlx::Error::ColumnDecode {
            index: "event".into(),
            source: Box::new(e),
        })
    }
}
