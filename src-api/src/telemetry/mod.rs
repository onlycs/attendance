pub(crate) mod events;
mod query;
mod stream;

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
    #[oai(path = "/search", method = "post")]
    async fn search(
        &self,
        request: Json<query::Request>,
        jwt: Jwt,
    ) -> Result<Json<query::Response>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        Ok(Json(query::route(request.0, self.pg.clone()).await?))
    }

    #[oai(path = "/:id", method = "get")]
    async fn get(
        &self,
        id: Path<String>,
        jwt: Jwt,
    ) -> Result<Json<TelemetryEvent>, query::ByIdError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        Ok(Json(query::by_id(id.0, self.pg.clone()).await?))
    }

    /// Creates a new stream filter, returning an ID.
    #[oai(path = "/stream/filter", method = "post")]
    async fn filter_create(
        &self,
        request: Json<Option<query::EventTypeFilter>>,
        jwt: Jwt,
    ) -> Result<PlainText<String>, stream::CreateError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        let id = cuid2();
        let filter = request.0;
        let pg = self.pg.clone();

        sqlx::query!(
            r#"
            INSERT INTO telemetry_streams (id, filter)
            VALUES ($1, $2)
            "#,
            id,
            serde_json::to_value(&filter)?,
        )
        .execute(&pg)
        .await?;

        tokio::spawn(async move {
            sqlx::query!(
                r#"
                DELETE FROM telemetry_streams
                WHERE updated_at < (NOW() - INTERVAL '1 hour')
                "#
            )
            .execute(&pg)
            .await
            .log();
        });

        Ok(PlainText(id))
    }

    #[oai(path = "/stream/filter", method = "put")]
    async fn filter_update(
        &self,
        id: Query<String>,
        request: Json<Option<query::EventTypeFilter>>,
        jwt: Jwt,
    ) -> Result<(), stream::UpdateError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        sqlx::query!(
            r#"
            UPDATE telemetry_streams
            SET filter = $2, updated_at = NOW()
            WHERE id = $1
            "#,
            id.0,
            serde_json::to_value(&request.0).map_err(|e| sqlx::Error::Encode(Box::new(e)))?,
        )
        .execute(&self.pg)
        .await?;

        Ok(())
    }

    #[oai(path = "/stream/:id", method = "get")]
    async fn stream(
        &self,
        id: Path<Option<String>>,
        jwt: Jwt,
    ) -> Result<EventStream<BoxStream<'static, TelemetryEvent>>, stream::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Telemetry)?;

        let stream = dbstream::stream::<TelemetryEvent>().await;
        let pg = self.pg.clone();

        sqlx::query!(
            r#"
            SELECT id, filter
            FROM telemetry_streams
            WHERE id = COALESCE($1, id)
            "#,
            id.0,
        )
        .fetch_optional(&self.pg)
        .await?
        .ok_or_else(stream::Error::not_found)?;

        Ok(EventStream::new(Box::pin(stream.filter_map(move |repl| {
            let id = id.0.clone();
            let pg = pg.clone();

            async move {
                let filter = if let Some(id) = id.as_ref() {
                    let rec = sqlx::query!(
                        r#"
                        UPDATE telemetry_streams
                        SET updated_at = NOW()
                        WHERE id = $1
                        RETURNING filter
                        "#,
                        id,
                    )
                    .fetch_optional(&pg)
                    .await
                    .ok()?; // throw if query fails, not if record DNE

                    // typeof rec after deser is:
                    // option<option<filter>>
                    // - None if record DNE
                    // - Some(None) if record exists but filter is None
                    // - Some(Some(filter)) if record exists and filter is not None
                    rec.and_then(|r| serde_json::from_value(r.filter).ok())
                } else {
                    // above branch still returns option<option<filter>>
                    None::<Option<query::EventTypeFilter>>
                }
                .flatten();

                match repl {
                    Ok(dbstream::Replication::Insert(event))
                        if filter.is_none_or(|f| f.matches(&event)) =>
                    {
                        Some(event)
                    }
                    _ => None,
                }
            }
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
