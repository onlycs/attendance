mod invite;
pub(crate) mod jwt;
mod login;
mod onboard;
mod prelude;
mod register;

use poem_openapi::param::Header;
use prelude::*;

pub(crate) struct AuthService {
    pg: PgPool,
}

impl AuthService {
    pub(crate) fn new(pg: PgPool) -> Self {
        Self { pg }
    }
}

#[auto_operation_ids]
#[OpenApi(tag = "Tag::Auth", prefix_path = "/auth")]
impl AuthService {
    #[oai(path = "/login", method = "get")]
    async fn login_start(
        &self,
        username: Query<String>,
    ) -> Result<Json<login::StartResponse>, login::StartError> {
        let res = login::start(username.0, self.pg.clone()).await?;
        Ok(Json(res))
    }

    #[oai(path = "/login", method = "post")]
    async fn login_finish(
        &self,
        request: Json<login::FinishRequest>,
    ) -> Result<Json<login::FinishResponse>, login::FinishError> {
        let res = login::finish(request.0, self.pg.clone()).await?;
        Ok(Json(res))
    }

    #[oai(path = "/invite", method = "post")]
    async fn invite(
        &self,
        request: Json<invite::Request>,
        jwt: Jwt,
    ) -> Result<Json<invite::Response>, invite::Error> {
        let claims = jwt.verify()?;
        claims.perms.assert(Permission::AdminInvite)?;

        Ok(Json(
            invite::route(request.0, claims, self.pg.clone()).await?,
        ))
    }

    #[oai(path = "/register", method = "get")]
    async fn register_start(
        &self,
        token: Query<String>,
    ) -> Result<Json<register::StartResponse>, register::StartError> {
        Ok(Json(register::start(token.0, self.pg.clone()).await?))
    }

    #[oai(path = "/register", method = "post")]
    async fn register_finish(
        &self,
        request: Json<register::FinishRequest>,
    ) -> Result<(), register::FinishError> {
        register::finish(request.0, self.pg.clone()).await?;
        Ok(())
    }

    #[oai(path = "/reregister", method = "post")]
    async fn reregister(
        &self,
        request: Json<register::ReregisterRequest>,
        jwt: Jwt,
    ) -> Result<(), register::FinishError> {
        let claims = jwt.verify()?;
        register::reregister(request.0, claims.sub, self.pg.clone()).await?;
        Ok(())
    }

    #[oai(path = "/onboard/token", method = "post")]
    async fn onboard_token(&self) -> Result<(), onboard::SetupKeyError> {
        onboard::token(self.pg.clone()).await?;
        Ok(())
    }

    #[oai(path = "/onboard", method = "get")]
    async fn onboard_start(
        &self,
        /// The setup token obtained from /auth/onboard/token
        #[oai(name = "x-token")]
        key: Header<String>,
    ) -> Result<Json<onboard::StartResponse>, onboard::StartError> {
        Ok(Json(onboard::start(self.pg.clone(), key.0).await?))
    }

    #[oai(path = "/onboard", method = "post")]
    async fn onboard_finish(
        &self,
        request: Json<onboard::FinishRequest>,
    ) -> Result<(), onboard::FinishError> {
        onboard::finish(request.0, self.pg.clone()).await?;
        Ok(())
    }
}
