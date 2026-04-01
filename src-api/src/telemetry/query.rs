use itertools::Itertools;
use poem_openapi::Union;
use sqlx::AssertSqlSafe;

use crate::{dbstream::Admin, prelude::*, telemetry::TelemetryEvent};

const MAX_COUNT: usize = 100;
const DEFAULT_COUNT: usize = 30;

#[derive(Serialize, Deserialize, Object, Clone, Debug)]
pub(super) struct AdminIdFilter {
    /// List of admin IDs to filter by
    ///
    /// This will correspond to the admin who performed or otherwise authorized
    /// or triggered the event.
    ///
    /// This will NOT correspond to the admin that was acted upon, if any,
    /// unless, of course, it is the same as the acting admin.
    admin_id: Vec<String>,
}

impl AdminIdFilter {
    fn matches(&self, admin_id: &str) -> bool {
        self.admin_id.contains(&admin_id.to_string()) || self.admin_id.is_empty()
    }
}

#[derive(Serialize, Deserialize, Object, Clone, Debug)]
pub(super) struct AdminOperationFilter {
    /// Corresponds to the admin who performed the operation
    admin_id: Vec<String>,

    /// Corresponds to the admin acted upon.
    target_id: Vec<String>,
}

impl AdminOperationFilter {
    fn matches(&self, admin_id: &str, target_id: &str) -> bool {
        let admin = self.admin_id.contains(&admin_id.to_string()) || self.admin_id.is_empty();
        let target = self.target_id.contains(&target_id.to_string()) || self.target_id.is_empty();

        admin && target
    }

    fn match_admin(&self, admin_id: &str, target: &Admin) -> bool {
        self.matches(admin_id, &target.id)
    }
}

#[derive(Serialize, Deserialize, Object, Clone, Debug)]
pub(super) struct InviteUseFilter {
    /// List of inviter IDs to filter by
    inviter_id: Vec<String>,

    /// List of invitee IDs to filter by
    invitee_id: Vec<String>,
}

impl InviteUseFilter {
    fn matches(&self, inviter_id: &str, invitee_id: &str) -> bool {
        let inviter =
            self.inviter_id.contains(&inviter_id.to_string()) || self.inviter_id.is_empty();
        let invitee =
            self.invitee_id.contains(&invitee_id.to_string()) || self.invitee_id.is_empty();

        inviter && invitee
    }
}

#[derive(Serialize, Deserialize, Object, Clone, Debug)]
pub(super) struct StudentActionFilter {
    /// List of admin IDs to filter by
    admin_id: Vec<String>,

    /// List of student hashed SIDs to filter by
    sid_hashed: Vec<String>,
}

impl StudentActionFilter {
    fn matches(&self, admin_id: &str, sid_hashed: &str) -> bool {
        let admin = self.admin_id.contains(&admin_id.to_string()) || self.admin_id.is_empty();
        let sid = self.sid_hashed.contains(&sid_hashed.to_string()) || self.sid_hashed.is_empty();

        admin && sid
    }
}

#[derive(Serialize, Deserialize, Union, Clone, Debug)]
#[oai(
    rename = "EventTypeFilter",
    discriminator_name = "event",
    rename_all = "snake_case"
)]
pub(super) enum EventTypeFilter {
    AdminDelete(AdminOperationFilter),
    AdminEdit(AdminOperationFilter),
    PermissionEdit(AdminOperationFilter),
    AdminLogin(AdminIdFilter),
    InviteAdd(AdminIdFilter),
    InviteUse(InviteUseFilter),
    RecordAdd(AdminIdFilter),
    RecordDelete(AdminIdFilter),
    RecordEdit(AdminIdFilter),
    StudentAdd(AdminIdFilter),
    StudentDelete(AdminIdFilter),
    StudentEdit(AdminIdFilter),
    StudentLogin(StudentActionFilter),
    StudentLogout(StudentActionFilter),
}

impl EventTypeFilter {
    pub(super) fn matches(&self, event: &TelemetryEvent) -> bool {
        macro_rules! filter_match {
            (@use $f:ident,, $($field:ident),*) => {
                $f.matches( $( $field ),* )
            };

            (@use $f:ident, $matcher:ident, $($field:ident),*) => {
                $f.$matcher( $( $field ),* )
            };

            ($($variant:ident { $($field:ident),* $(,)? }  $($matcher:ident)?);* $(;)?) => {
                match self {
                    $(
                        EventTypeFilter::$variant(f) if let Event::$variant( $variant { $($field),*, .. } ) = &event.event => {
                            filter_match!(@use f, $($matcher)?, $($field),*)
                        },
                        EventTypeFilter::$variant(_) => false,
                    )*
                }
            };
        }

        filter_match!(
            AdminLogin { id };
            InviteAdd { admin_id };
            InviteUse { inviter_id, invitee_id };
            AdminDelete { admin_id, target } match_admin;
            AdminEdit { admin_id, old } match_admin;
            PermissionEdit { admin_id, target_id };
            RecordAdd { admin_id };
            RecordDelete { admin_id };
            RecordEdit { admin_id };
            StudentAdd { admin_id };
            StudentDelete { admin_id };
            StudentEdit { admin_id };
            StudentLogin { admin_id, sid_hashed };
            StudentLogout { admin_id, sid_hashed };
        )
    }

    #[allow(clippy::wrong_self_convention)]
    fn into_sql(&self) -> String {
        macro_rules! to_sql {
            (@condition $variant:ident $field:ident) => {
                to_sql!(@condition $variant $field $field)
            };

            (@condition $variant:ident $field:ident $sql_field:ident) => {
                $variant.$field
                    .iter()
                    .map(|val| {
                        let escape = val.replace('\'', "''");
                        format!("data->>'{}' = '{}'", stringify!($sql_field), escape)
                    })
                    .join(" OR ")
            };

            (@condition $variant:ident $field:ident $sql_field:ident $sql_subfield:ident) => {
                $variant.$field
                    .iter()
                    .map(|val| {
                        let escape = val.replace('\'', "''"); // xkcd 327
                        format!("data->'{}'->>'{}' = '{}'", stringify!($sql_field), stringify!($sql_subfield), escape)
                    })
                    .join(" OR ")
            };

            ($($variant:ident { $($field:ident $(as $sql_field:ident $(. $sql_subfield:ident)?)?),* $(,)? });* $(;)?) => {
                match self {
                    $(
                        EventTypeFilter::$variant(etf) => {
                            let conditions = vec![
                                format!("event = '{}'", ::heck::ToSnakeCase::to_snake_case(stringify!($variant))),
                                $(to_sql!(@condition etf $field $($sql_field $($sql_subfield)?)?)),*
                            ];

                            conditions.into_iter().filter(|s| !s.trim().is_empty()).join(" AND ")
                        }
                    )*
                }
            };
        }

        to_sql!(
            AdminDelete { admin_id, target_id as target.id };
            AdminEdit { admin_id, target_id as old.id };
            AdminLogin { admin_id as id };
            InviteAdd { admin_id };
            InviteUse { inviter_id, invitee_id };
            PermissionEdit { admin_id, target_id };
            RecordAdd { admin_id };
            RecordDelete { admin_id };
            RecordEdit { admin_id };
            StudentAdd { admin_id };
            StudentDelete { admin_id };
            StudentEdit { admin_id };
            StudentLogin { admin_id, sid_hashed };
            StudentLogout { admin_id, sid_hashed };
        )
    }
}

#[derive(Object, Clone, Debug)]
pub(super) struct FilterCounted {
    /// Number of telemetry events to retrieve.
    ///
    /// Maximum: 100
    #[oai(default = "_default_count")]
    count: usize,

    /// Number of telemetry events to skip. Will be sorted by timestamp
    /// descending.
    ///
    /// Default: 0
    #[oai(default)]
    skip: usize,
}

#[derive(Object, Clone, Debug)]
pub(super) struct FilterDateRange {
    /// Start time for telemetry events
    after: chrono::DateTime<Utc>,

    /// End time for telemetry events
    ///
    /// Default: now
    #[oai(default = "chrono::Utc::now")]
    before: chrono::DateTime<Utc>,
}

#[derive(Union, Clone, Debug)]
#[oai(discriminator_name = "query_type", rename_all = "snake_case")]
pub(super) enum QueryFilter {
    Counted(FilterCounted),
    DateRange(FilterDateRange),
}

fn _default_count() -> usize {
    DEFAULT_COUNT
}

#[derive(Object, Clone, Debug)]
#[oai(rename = "TelemetryQueryRequest")]
pub(super) struct Request {
    event_type: Option<EventTypeFilter>,
    query: QueryFilter,
}

#[derive(Object)]
#[oai(rename = "TelemetryResponse")]
pub(super) struct Response {
    events: Vec<TelemetryEvent>,
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[doc = concat!("Too much telemetry queried (>", stringify!(MAX_COUNT), ")")]
    #[oai(status = 400)]
    #[construct(high_count, "Too much telemetry queried (>{MAX_COUNT})")]
    #[construct(date_range, "Invalid date range (`after` must be before `before`)")]
    BadRequest(PlainText<String>),

    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum ByIdError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 404)]
    #[construct("No telemetry event with the specified ID exists")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(
    Request { event_type, query }: Request,
    pg: PgPool,
) -> Result<Response, Error> {
    if let QueryFilter::DateRange(FilterDateRange { after, before }) = &query {
        if after > before {
            return Err(Error::date_range());
        }

        let events = sqlx::query_as::<_, TelemetryEvent>(AssertSqlSafe(format!(
            r#"
            SELECT * FROM telemetry
            WHERE timestamp >= $1 AND timestamp <= $2 {}
            ORDER BY timestamp DESC
            "#,
            event_type
                .as_ref()
                .map_or_else(String::new, |f| format!("AND {}", f.into_sql()))
        )))
        .bind(*after)
        .bind(*before)
        .fetch_all(&pg)
        .await?;

        return Ok(Response { events });
    }

    let QueryFilter::Counted(FilterCounted { count, skip }) = query else {
        unreachable!()
    };

    if count > MAX_COUNT {
        return Err(Error::high_count());
    }

    let events = sqlx::query_as::<_, TelemetryEvent>(AssertSqlSafe(format!(
        r#"
        SELECT * FROM telemetry
        {}
        ORDER BY timestamp DESC
        OFFSET $2
        LIMIT $1
        "#,
        event_type
            .as_ref()
            .map_or_else(String::new, |f| format!("WHERE {}", f.into_sql()))
    )))
    .bind(count as i32)
    .bind(skip as i64)
    .fetch_all(&pg)
    .await?;

    Ok(Response { events })
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn by_id(id: String, pg: PgPool) -> Result<TelemetryEvent, ByIdError> {
    let event = sqlx::query_as::<_, TelemetryEvent>("SELECT * FROM telemetry WHERE id = $1")
        .bind(id)
        .fetch_optional(&pg)
        .await?
        .ok_or_else(ByIdError::not_found)?;

    Ok(event)
}
