pub(crate) mod events;
mod query;

use std::{collections::HashMap, sync::Arc};

pub(crate) use events::{EventType, TelemetryEvent};
use futures_util::stream::BoxStream;
use poem_openapi::payload::EventStream;
use tokio::sync::Mutex;

use crate::prelude::*;

pub(crate) struct TelemetryService {
    pg: PgPool,
    streams: Arc<Mutex<HashMap<String, query::Filter>>>,
}

impl TelemetryService {
    pub(crate) fn new(pg: PgPool) -> Self {
        Self {
            pg,
            streams: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[auto_operation_ids]
#[OpenApi(tag = "Tag::Telemetry", prefix_path = "/telemetry")]
impl TelemetryService {
    #[oai(path = "/search", method = "post")]
    async fn get(
        &self,
        request: Json<query::Request>,
        jwt: Jwt,
    ) -> Result<Json<query::Response>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        Ok(Json(query::route(request.0, self.pg.clone()).await?))
    }

    #[oai(path = "/stream", method = "post")]
    async fn create_stream(
        &self,
        request: Json<query::Filter>,
        jwt: Jwt,
    ) -> Result<PlainText<String>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        let id = cuid2();
        let filter = request.0;

        let mut streams = self.streams.lock().await;
        streams.insert(id.clone(), filter);

        Ok(PlainText(id))
    }

    #[oai(path = "/stream", method = "get")]
    async fn stream(
        &self,
        id: Query<Option<String>>,
        jwt: Jwt,
    ) -> Result<EventStream<BoxStream<'static, TelemetryEvent>>, query::StreamError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        let filter = if let Some(id) = id.0 {
            let mut streams = self.streams.lock().await;
            streams
                .remove(&id)
                .ok_or_else(|| query::StreamError::not_found())?
        } else {
            query::Filter::default()
        };

        let stream = dbstream::stream::<TelemetryEvent>().await;
        Ok(EventStream::new(Box::pin(stream.filter_map(move |repl| {
            let evt = match repl {
                Ok(dbstream::Replication::Insert(event)) if filter.matches(&event) => Some(event),
                _ => None,
            };

            async move { evt }
        }))))
    }
}

pub async fn telemeter(
    event: impl events::EventSerializable,
    pg: &PgPool,
) -> Result<(), sqlx::Error> {
    let (evt, json) = event.sql_pair().map_err(|e| sqlx::Error::ColumnDecode {
        index: "data".into(),
        source: Box::new(e),
    })?;

    sqlx::query!(
        r#"
        INSERT INTO telemetry (id, event, data)
        VALUES ($1, $2, $3)
        "#,
        cuid2(),
        evt as EventType,
        json,
    )
    .execute(pg)
    .await?;

    Ok(())
}
