use poem_openapi::Union;

use crate::{dbstream::Admin, prelude::*, telemetry::TelemetryEvent};

const MAX_COUNT: usize = 100;
const DEFAULT_COUNT: usize = 30;

#[derive(Serialize, Deserialize, Object, Clone, Debug)]
struct AdminIdFilter {
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
struct AdminOperationFilter {
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
struct InviteUseFilter {
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
struct StudentActionFilter {
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
    discriminator_name = "type",
    rename_all = "snake_case"
)]
enum EventTypeFilter {
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
    fn matches(&self, event: &TelemetryEvent) -> bool {
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
}

#[derive(Serialize, Deserialize, Object, Clone, Debug)]
#[oai(rename = "TelemetryFilter")]
#[oai(default)]
pub(super) struct Filter {
    /// Type of telemetry event to retrieve
    event_type: Option<EventTypeFilter>,

    /// Start time for telemetry events
    after: Option<chrono::DateTime<Utc>>,

    /// End time for telemetry events
    before: Option<chrono::DateTime<Utc>>,
}

impl Filter {
    pub(super) fn matches(&self, event: &TelemetryEvent) -> bool {
        if let Some(after) = self.after
            && event.timestamp < after
        {
            return false;
        }

        if let Some(before) = self.before
            && event.timestamp > before
        {
            return false;
        }

        if let Some(event_type) = &self.event_type
            && !event_type.matches(event)
        {
            return false;
        }

        true
    }
}

impl Default for Filter {
    fn default() -> Self {
        Self {
            event_type: None,
            after: None,
            before: None,
        }
    }
}

fn _default_count() -> usize {
    DEFAULT_COUNT
}

#[derive(Object)]
#[oai(rename = "TelemetryQueryRequest")]
pub(super) struct Request {
    /// Number of telemetry events to retrieve.
    ///
    /// This will correspond to the events fetched from the database PRECEDING
    /// ALL OTHER FILTERING. In other words, you are NOT guaranteed to receive
    /// `count` events in the response, as the filtering is done after fetching.
    ///
    /// You will not recieve an empty response unless there are no events
    /// matching your filters.
    ///
    /// Maximum: 100
    #[oai(default = "_default_count")]
    pub count: usize,

    /// Number of telemetry events to skip. Will be sorted by timestamp
    /// descending.
    ///
    /// Default: 0
    #[oai(default)]
    pub skip: usize,

    /// Filters to apply to the telemetry events.
    ///
    /// All filters are applied after the initial `count` and `skip` are
    /// applied to the database query.
    #[oai(default)]
    pub filters: Filter,
}

impl Default for Request {
    fn default() -> Self {
        Self {
            count: DEFAULT_COUNT,
            skip: 0,
            filters: Filter::default(),
        }
    }
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
    Request {
        count,
        skip,
        filters,
    }: Request,
    pg: PgPool,
) -> Result<Response, Error> {
    if count > MAX_COUNT {
        return Err(Error::high_count());
    }

    let records = sqlx::query_as::<_, TelemetryEvent>(
        "SELECT * FROM telemetry ORDER BY timestamp LIMIT $1 OFFSET $2",
    )
    .bind(count as i32)
    .bind(skip as i64)
    .fetch_all(&pg)
    .await?;

    if records.is_empty() {
        return Ok(Response { events: vec![] });
    }

    let events: Vec<TelemetryEvent> = records
        .into_iter()
        .filter(|evt| filters.matches(evt))
        .collect();

    if events.is_empty() {
        return Box::pin(route(
            Request {
                count,
                skip: skip + count,
                filters,
            },
            pg,
        ))
        .await;
    }

    Ok(Response { events })
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn by_id(id: String, pg: PgPool) -> Result<TelemetryEvent, ByIdError> {
    let event = sqlx::query_as::<_, TelemetryEvent>("SELECT * FROM telemetry WHERE id = $1")
        .bind(id)
        .fetch_optional(&pg)
        .await?
        .ok_or_else(|| ByIdError::not_found())?;

    Ok(event)
}
