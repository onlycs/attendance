pub mod chrono_temporal {
    use chrono::{DateTime, Local};
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<S, T>(dt: &T, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        T: Serialize,
    {
        dt.serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Local>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s: &str = Deserialize::deserialize(deserializer)?;
        // Strip any "[...]" suffix
        let s = s.split('[').next().unwrap_or(s);
        s.parse::<DateTime<Local>>()
            .map_err(serde::de::Error::custom)
    }

    pub mod optional {
        use super::{DateTime, Deserialize, Deserializer, Local, Serializer};

        pub fn serialize<S>(dt: &Option<DateTime<Local>>, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: Serializer,
        {
            match dt {
                Some(dt) => super::serialize(dt, serializer),
                None => serializer.serialize_none(),
            }
        }

        pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Local>>, D::Error>
        where
            D: Deserializer<'de>,
        {
            let opt: Option<&str> = Option::deserialize(deserializer)?;
            if let Some(s) = opt
                && let Some(s) = s.split('[').next()
            {
                let dt = s
                    .parse::<DateTime<Local>>()
                    .map_err(serde::de::Error::custom)?;
                Ok(Some(dt))
            } else {
                Ok(None)
            }
        }
    }
}
