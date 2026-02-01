mod crud;
mod hour_type;
mod present;
mod swipe;
mod totp;

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
        request: Json<swipe::Request>,
    ) -> Result<Json<swipe::Response>, swipe::SwipeError> {
        Ok(Json(swipe::route(request.0, self.pg.clone()).await?))
    }

    #[oai(path = "/totp", method = "post")]
    async fn totp(
        &self,
        request: Json<totp::Request>,
        jwt: Jwt,
    ) -> Result<Json<totp::Response>, totp::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::Roster)?;
        Ok(Json(
            totp::route(request.0, claims.sub, self.pg.clone()).await?,
        ))
    }

    #[oai(path = "/present", method = "get")]
    async fn present_query(
        &self,
        jwt: Jwt,
    ) -> Result<Json<present::Response>, present::QueryError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursView)?;

        Ok(Json(present::query(self.pg.clone()).await?))
    }

    #[oai(path = "/present/stream", method = "get")]
    async fn present_stream(
        &self,
        jwt: Jwt,
    ) -> Result<EventStream<BoxStream<'static, present::Response>>, present::QueryError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursView)?;

        let stream = dbstream::stream::<dbstream::Record>().await;
        let pg = self.pg.clone();

        Ok(EventStream::new(Box::pin(stream.filter_map(move |_| {
            let pg = pg.clone();
            async move {
                match present::query(pg).await {
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

        Ok(Json(crud::add(request.0, claims, self.pg.clone()).await?))
    }

    #[oai(path = "/", method = "patch")]
    async fn record_update(
        &self,
        request: Json<crud::UpdateRequest>,
        jwt: Jwt,
    ) -> Result<Json<crud::UpdateResponse>, crud::UpdateError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursEdit)?;

        Ok(Json(
            crud::update(request.0, claims, self.pg.clone()).await?,
        ))
    }

    #[oai(path = "/", method = "delete")]
    async fn record_delete(
        &self,
        request: Json<crud::DeleteRequest>,
        jwt: Jwt,
    ) -> Result<Json<crud::DeleteResponse>, crud::DeleteError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursEdit)?;

        Ok(Json(
            crud::delete(request.0, claims, self.pg.clone()).await?,
        ))
    }

    #[oai(path = "/allowed", method = "get")]
    async fn allowed(&self, jwt: Jwt) -> Result<Json<Vec<HourType>>, hour_type::AllowedError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursView)?;
        Ok(Json(hour_type::allowed()))
    }
}
