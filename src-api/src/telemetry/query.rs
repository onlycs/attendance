use crate::{
    prelude::*,
    telemetry::{EventType, TelemetryEvent},
};

const MAX: usize = 50;

#[derive(Object)]
#[oai(rename = "TelemetryResponse")]
pub(super) struct Response {
    events: Vec<TelemetryEvent>,
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[doc = concat!("Too much telemetry queried (>", stringify!(MAX), ")")]
    #[oai(status = 400)]
    #[construct(high_count, "Too much telemetry queried (>{MAX})")]
    BadRequest(PlainText<String>),

    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(count: usize, skip: usize, pg: PgPool) -> Result<Response, Error> {
    if count > MAX {
        return Err(Error::high_count());
    }

    let records = sqlx::query_as::<_, TelemetryEvent>(
        "SELECT * FROM telemetry ORDER BY timestamp LIMIT $1 OFFSET $2",
    )
    .bind(count as i32)
    .bind(skip as i64)
    .fetch_all(&pg)
    .await?;

    Ok(Response { events: records })
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn by_type(
    event_type: EventType,
    count: usize,
    skip: usize,
    pg: PgPool,
) -> Result<Response, Error> {
    if count > 100 {
        return Err(Error::high_count());
    }

    let records = sqlx::query_as::<_, TelemetryEvent>(
        "SELECT * FROM telemetry WHERE event_type = $3 ORDER BY timestamp LIMIT $1 OFFSET $2",
    )
    .bind(count as i32)
    .bind(skip as i64)
    .bind(event_type)
    .fetch_all(&pg)
    .await?;

    Ok(Response { events: records })
}
