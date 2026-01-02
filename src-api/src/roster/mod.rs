mod crud;
mod hour_type;
mod swipe;

use futures_util::stream::BoxStream;
pub(crate) use hour_type::HourType;
use poem_openapi::payload::EventStream;

use crate::{
    dbstream::{Record, ReplicateRecord},
    prelude::*,
};

pub(crate) struct RosterService {
    pg: PgPool,
}

impl RosterService {
    pub(crate) fn new(pg: PgPool) -> Self {
        Self { pg }
    }
}

#[auto_operation_ids]
#[OpenApi(tag = "Tag::Roster", prefix_path = "/roster")]
impl RosterService {
    #[oai(path = "/swipe", method = "post")]
    async fn swipe(
        &self,
        request: Json<swipe::SwipeRequest>,
        jwt: Jwt,
    ) -> Result<Json<swipe::SwipeResponse>, swipe::SwipeError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Roster)?;

        Ok(Json(swipe::route(request.0, self.pg.clone()).await?))
    }

    #[oai(path = "/swipe", method = "get")]
    async fn swipes_query(
        &self,
        jwt: Jwt,
    ) -> Result<Json<swipe::QueryResponse>, swipe::QueryError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursView)?;

        Ok(Json(swipe::query(self.pg.clone()).await?))
    }

    #[oai(path = "/swipe/stream", method = "get")]
    async fn swipes_stream(
        &self,
        jwt: Jwt,
    ) -> Result<EventStream<BoxStream<'static, swipe::QueryResponse>>, swipe::QueryError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursView)?;

        let stream = dbstream::stream::<dbstream::Record>().await;
        let pg = self.pg.clone();

        Ok(EventStream::new(Box::pin(stream.filter_map(move |repl| {
            let pg = pg.clone();
            async move {
                let Ok(_) = repl else {
                    return None;
                };

                match swipe::query(pg).await {
                    Ok(res) => Some(res),
                    Err(err) => {
                        tracing::error!("Error in roster stream: {}", err);
                        None
                    }
                }
            }
        }))))
    }

    #[oai(path = "/", method = "get")]
    async fn record_query(
        &self,
        jwt: Jwt,
        id: Query<Option<String>>,
    ) -> Result<Json<crud::GetResponse>, crud::GetError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursView)?;
        Ok(Json(crud::get(id.0, self.pg.clone()).await?))
    }

    #[oai(path = "/stream", method = "get")]
    async fn record_stream(
        &self,
        jwt: Jwt,
    ) -> Result<EventStream<BoxStream<'static, ReplicateRecord>>, crud::GetError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursView)?;

        let stream = dbstream::stream::<Record>().await;

        Ok(EventStream::new(Box::pin(
            stream.filter_map(|repl| async move { repl.ok() }),
        )))
    }

    #[oai(path = "/", method = "post")]
    async fn record_add(
        &self,
        request: Json<crud::CreateRequest>,
        jwt: Jwt,
    ) -> Result<Json<crud::CreateResponse>, crud::CreateError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursEdit)?;
        Ok(Json(crud::add(request.0, self.pg.clone()).await?))
    }

    #[oai(path = "/", method = "patch")]
    async fn record_update(
        &self,
        request: Json<crud::UpdateRequest>,
        jwt: Jwt,
    ) -> Result<Json<crud::UpdateResponse>, crud::UpdateError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursEdit)?;
        Ok(Json(crud::update(request.0, self.pg.clone()).await?))
    }

    #[oai(path = "/", method = "delete")]
    async fn record_delete(
        &self,
        request: Json<crud::DeleteRequest>,
        jwt: Jwt,
    ) -> Result<Json<crud::DeleteResponse>, crud::DeleteError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursEdit)?;
        Ok(Json(crud::delete(request.0, self.pg.clone()).await?))
    }
}
