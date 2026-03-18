mod delete;
mod query;
mod update;

use futures_util::stream::BoxStream;
use poem_openapi::payload::EventStream;

use crate::{
    auth::jwt::Permissions,
    dbstream::{Admin, ReplicateAdmin},
    prelude::*,
};

pub(crate) struct AdminService {
    pg: PgPool,
}

impl AdminService {
    pub(crate) fn new(pg: PgPool) -> Self {
        Self { pg }
    }
}

#[auto_operation_ids]
#[OpenApi(tag = "Tag::Admin", prefix_path = "/admin")]
impl AdminService {
    #[oai(path = "/", method = "get")]
    async fn query_many(
        &self,
        jwt: Jwt,
    ) -> Result<Json<query::QueryManyResponse>, query::QueryManyError> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::AdminView)?;

        Ok(Json(query::many(self.pg.clone()).await?))
    }

    #[oai(path = "/:id", method = "get")]
    async fn query_one(
        &self,
        id: Path<String>,
        jwt: Jwt,
    ) -> Result<Json<query::Response>, query::Error> {
        let claims = jwt.verify()?;

        // obviously, if we're querying our own information, go right ahead. ts should*
        // be in the JWT, but you do you ig
        if id.0 != claims.sub {
            claims.perms.assert(Permission::AdminView)?;
        }

        Ok(Json(query::one(id.0, self.pg.clone()).await?))
    }

    #[oai(path = "/stream", method = "get")]
    async fn stream(
        &self,
        jwt: Jwt,
    ) -> Result<EventStream<BoxStream<'static, ReplicateAdmin>>, query::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::AdminView)?;

        let stream = dbstream::stream::<Admin>().await;

        Ok(EventStream::new(Box::pin(
            stream.filter_map(|repl| async move { repl.ok() }),
        )))
    }

    #[oai(path = "/", method = "patch")]
    async fn update(
        &self,
        request: Json<update::UpdateRequest>,
        jwt: Jwt,
    ) -> Result<Json<update::UpdateResponse>, update::UpdateError> {
        let claims = jwt.verify()?;

        // if we are changing a different admin, we need admin edit permissions.
        // otherwise, we are just changing our own username and we don't care
        if claims.sub != request.0.id {
            claims.perms.assert(Permission::AdminEdit)?;
        }

        Ok(Json(
            update::route(request.0, claims, self.pg.clone()).await?,
        ))
    }

    #[oai(path = "/:id/permissions", method = "get")]
    async fn permissions_query(
        &self,
        id: Path<String>,
        jwt: Jwt,
    ) -> Result<Json<Permissions>, query::Error> {
        let claims = jwt.verify()?;

        // if we're querying our own permissions, go right ahead. otherwise, we need
        // admin view permissions
        if id.0 != claims.sub {
            claims.perms.assert(Permission::AdminView)?;
        }

        Ok(Json(query::permissions(id.0, self.pg.clone()).await?))
    }

    #[oai(path = "/:id/permissions", method = "put")]
    async fn permissions_update(
        &self,
        id: Path<String>,
        perms: Json<Permissions>,
        jwt: Jwt,
    ) -> Result<(), update::PermissionUpdateError> {
        let claims = jwt.verify()?;

        // outright deny if we're trying to change our own permissions
        if claims.sub == id.0 {
            return Err(update::PermissionUpdateError::disallow_self());
        }

        update::update_permissions(id.0, perms.0, claims, self.pg.clone()).await?;

        Ok(())
    }

    #[oai(path = "/", method = "delete")]
    async fn delete(
        &self,
        request: Json<delete::Request>,
        jwt: Jwt,
    ) -> Result<Json<delete::Response>, delete::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::HoursEdit)?;

        Ok(Json(
            delete::route(request.0, claims, self.pg.clone()).await?,
        ))
    }
}
