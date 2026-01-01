mod add;
mod delete;
mod hours;
mod query;
mod update;

use futures_util::stream::BoxStream;
use poem_openapi::payload::EventStream;

use crate::{dbstream::ReplicateStudent, prelude::*};

pub(crate) struct StudentService {
    pg: PgPool,
}

impl StudentService {
    pub(crate) fn new(pg: PgPool) -> Self {
        Self { pg }
    }
}

#[auto_operation_ids]
#[OpenApi(tag = "Tag::Student", prefix_path = "/student")]
impl StudentService {
    #[oai(path = "/", method = "get")]
    async fn list(&self, jwt: Jwt) -> Result<Json<query::ListResponse>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::StudentView)?;
        Ok(Json(query::all(self.pg.clone()).await?))
    }

    #[oai(path = "/stream", method = "get")]
    async fn stream(
        &self,
        jwt: Jwt,
    ) -> Result<EventStream<BoxStream<'static, ReplicateStudent>>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::StudentView)?;

        let stream = dbstream::stream::<dbstream::Student>().await;

        Ok(EventStream::new(Box::pin(
            stream.filter_map(|repl| async move { repl.ok() }),
        )))
    }

    #[oai(path = "/", method = "post")]
    async fn add(&self, request: Json<add::Request>, jwt: Jwt) -> Result<(), add::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::StudentAdd)?;
        add::route(request.0, self.pg.clone()).await
    }

    #[oai(path = "/:id_hashed", method = "get")]
    async fn query(
        &self,
        id_hashed: Path<String>,
        jwt: Jwt,
    ) -> Result<Json<query::Response>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::StudentView)?;
        Ok(Json(query::route(id_hashed.0, self.pg.clone()).await?))
    }

    #[oai(path = "/:id_hashed", method = "patch")]
    async fn update(
        &self,
        id_hashed: Path<String>,
        request: Json<update::Request>,
        jwt: Jwt,
    ) -> Result<Json<update::Response>, update::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::StudentEdit)?;
        Ok(Json(
            update::route(id_hashed.0, request.0, self.pg.clone()).await?,
        ))
    }

    #[oai(path = "/:id_hashed", method = "delete")]
    async fn delete(
        &self,
        id_hashed: Path<String>,
        jwt: Jwt,
    ) -> Result<Json<delete::Response>, delete::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::StudentDelete)?;
        Ok(Json(delete::route(id_hashed.0, self.pg.clone()).await?))
    }

    #[oai(path = "/:id_hashed/hours", method = "get")]
    async fn hours(&self, id_hashed: Path<String>) -> Result<Json<hours::Response>, hours::Error> {
        Ok(Json(hours::route(id_hashed.0, self.pg.clone()).await?))
    }
}
