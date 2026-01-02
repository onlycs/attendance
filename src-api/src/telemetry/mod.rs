pub(crate) mod events;
mod query;

pub(crate) use events::{EventType, TelemetryEvent};
use futures_util::stream::BoxStream;
use poem_openapi::payload::EventStream;

use crate::prelude::*;

pub(crate) struct TelemetryService {
    pg: PgPool,
}

impl TelemetryService {
    pub(crate) fn new(pg: PgPool) -> Self {
        Self { pg }
    }
}

#[auto_operation_ids]
#[OpenApi(tag = "Tag::Telemetry", prefix_path = "/telemetry")]
impl TelemetryService {
    #[oai(path = "/", method = "get")]
    async fn get(
        &self,
        count: Query<usize>,
        skip: Query<usize>,
        jwt: Jwt,
    ) -> Result<Json<query::Response>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        Ok(Json(query::route(count.0, skip.0, self.pg.clone()).await?))
    }

    #[oai(path = "/stream", method = "get")]
    async fn stream(
        &self,
        jwt: Jwt,
    ) -> Result<EventStream<BoxStream<'static, TelemetryEvent>>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        let stream = dbstream::stream::<TelemetryEvent>().await;
        Ok(EventStream::new(Box::pin(stream.filter_map(
            |repl| async move {
                match repl.ok()? {
                    dbstream::Replication::Insert(event) => Some(event),
                    _ => None,
                }
            },
        ))))
    }

    #[oai(path = "/:event_type", method = "get")]
    async fn query(
        &self,
        event_type: Path<EventType>,
        count: Query<usize>,
        skip: Query<usize>,
        jwt: Jwt,
    ) -> Result<Json<query::Response>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        Ok(Json(
            query::by_type(event_type.0, count.0, skip.0, self.pg.clone()).await?,
        ))
    }
}
