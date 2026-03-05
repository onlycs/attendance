use chrono::Datelike;
use strum::{Display, EnumString, VariantArray};

use crate::prelude::*;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(crate) enum HourTypeError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(Object, Debug)]
pub(super) struct HourTypeInfo {
    /// Year is ignored, filtering is applied based on month and day only
    ///
    /// If null, automatic filtering is applied
    pub begins: Option<chrono::NaiveDate>,
    /// Year is ignored, filtering is applied based on month and day only
    ///
    /// If null, automatic filtering is applied
    pub ends: Option<chrono::NaiveDate>,
    /// In hours, can be fractional, must be nonnegative
    pub goal: f64,
}

impl Default for HourTypeInfo {
    fn default() -> Self {
        Self {
            begins: None,
            ends: None,
            goal: 0.0,
        }
    }
}

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
    VariantArray,
    Display,
    sqlx::Type,
)]
#[oai(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "hour_type", rename_all = "lowercase")]
pub(crate) enum HourType {
    Build,
    Learning,
    Demo,
    Offseason,
}

impl HourType {
    /// Check if this hour type is allowed in the given 1-based month.
    pub(crate) async fn allowed(self, pg: &PgPool) -> Result<bool, HourTypeError> {
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

        // assemble automatic logic
        let auto_build_start = kickoff_day;
        let auto_build_end = chrono::NaiveDate::from_ymd_opt(year, 4, 30).unwrap();
        let auto_offseason_start = chrono::NaiveDate::from_ymd_opt(year, 5, 1).unwrap();
        let auto_offseason_end = chrono::NaiveDate::from_ymd_opt(year, 11, 30).unwrap();
        let auto_learning_start = chrono::NaiveDate::from_ymd_opt(year, 9, 1).unwrap();
        let auto_learning_end = kickoff_day - chrono::Duration::days(1);

        // pull manual logic from database
        let info = self.query(pg.clone()).await?;
        let start = info
            .begins
            .and_then(|n| n.with_year(year))
            .unwrap_or_else(|| match self {
                HourType::Build => auto_build_start,
                HourType::Learning => auto_learning_start,
                HourType::Demo => chrono::NaiveDate::from_ymd_opt(year, 1, 1).unwrap(),
                HourType::Offseason => auto_offseason_start,
            });

        let end = info
            .ends
            .and_then(|n| n.with_year(year))
            .unwrap_or_else(|| match self {
                HourType::Build => auto_build_end,
                HourType::Learning => auto_learning_end,
                HourType::Demo => chrono::NaiveDate::from_ymd_opt(year, 12, 31).unwrap(),
                HourType::Offseason => auto_offseason_end,
            });

        if start <= end {
            Ok(today >= start && today <= end)
        } else {
            // range wraps end of year
            Ok(today >= start || today <= end)
        }
    }

    pub(super) async fn update(
        &self,
        HourTypeInfo {
            begins,
            ends,
            goal: requirement,
        }: HourTypeInfo,
        pg: PgPool,
    ) -> Result<(), HourTypeError> {
        sqlx::query!(
            r#"
            UPDATE hour_config
            SET begins = $2, ends = $3, goal = $4
            WHERE kind = $1
            "#,
            *self as HourType,
            begins,
            ends,
            requirement,
        )
        .execute(&pg)
        .await?;

        Ok(())
    }

    pub(super) async fn query(&self, pg: PgPool) -> Result<HourTypeInfo, HourTypeError> {
        let res = sqlx::query_as!(
            HourTypeInfo,
            r#"
            SELECT begins, ends, goal
            FROM hour_config
            WHERE kind = $1
            "#,
            *self as HourType,
        )
        .fetch_one(&pg)
        .await?;

        Ok(res)
    }

    pub(super) async fn goal(&self, pg: PgPool) -> Result<f64, HourTypeError> {
        let res = sqlx::query!(
            r#"SELECT goal FROM hour_config WHERE kind = $1"#,
            *self as HourType
        )
        .fetch_one(&pg)
        .await?;

        Ok(res.goal)
    }
}

#[tracing::instrument]
pub(crate) async fn allowed(pool: &PgPool) -> Result<Vec<HourType>, HourTypeError> {
    let mut allowed = Vec::with_capacity(HourType::VARIANTS.len());

    for &kind in HourType::VARIANTS {
        if kind.allowed(pool).await? {
            allowed.push(kind);
        }
    }

    Ok(allowed)
}
