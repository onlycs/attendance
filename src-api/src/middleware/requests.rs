use std::future::{Ready, ready};

use actix_web::{
    Error, Result,
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    http::StatusCode,
};
use futures_util::future::LocalBoxFuture;
use tracing::{info, warn};

pub struct RequestLog;

impl<S, B> Transform<S, ServiceRequest> for RequestLog
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Error = Error;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;
    type InitError = ();
    type Response = ServiceResponse<B>;
    type Transform = RequestLogService<S>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequestLogService { service }))
    }
}

pub struct RequestLogService<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for RequestLogService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;
    type Response = ServiceResponse<B>;

    actix_web::dev::forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let method = req.method().to_string();
        let path = req.path().to_string();
        let remote_addr = req
            .connection_info()
            .realip_remote_addr()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "unknown".to_string());
        let user_agent = req
            .headers()
            .get("user-agent")
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "unknown".to_string());
        let has_auth = req.headers().contains_key("authorization");

        match path.as_str() {
            p if p.starts_with("/auth/login") => {
                info!(
                    event_type = "authentication_attempt",
                    method = %method,
                    path = %path,
                    remote_addr = %remote_addr,
                    user_agent = %user_agent,
                    "Authentication attempt initiated"
                );
            }
            p if p.starts_with("/auth/register") => {
                info!(
                    event_type = "registration_attempt",
                    method = %method,
                    path = %path,
                    remote_addr = %remote_addr,
                    user_agent = %user_agent,
                    "Registration attempt initiated"
                );
            }
            p if p.starts_with("/auth/valid") => {
                info!(
                    event_type = "token_validation",
                    method = %method,
                    path = %path,
                    remote_addr = %remote_addr,
                    has_auth_header = %has_auth,
                    "Token validation requested"
                );
            }
            "/roster" | "/clear" => {
                if !has_auth {
                    warn!(
                        event_type = "unauthorized_access_attempt",
                        method = %method,
                        path = %path,
                        remote_addr = %remote_addr,
                        user_agent = %user_agent,
                        "Access attempted to protected resource without authentication"
                    );
                }
            }
            "/ws" => {
                info!(
                    event_type = "websocket_connection",
                    method = %method,
                    path = %path,
                    remote_addr = %remote_addr,
                    user_agent = %user_agent,
                    "WebSocket connection attempt"
                );
            }
            _ => {}
        }

        let fut = self.service.call(req);
        Box::pin(async move {
            let result = fut.await;

            if let Ok(response) = &result {
                let status = response.status();

                if status == StatusCode::UNAUTHORIZED {
                    warn!(
                        event_type = "authentication_failure",
                        method = %method,
                        path = %path,
                        status = %status.as_u16(),
                        remote_addr = %remote_addr,
                        "Authentication failed"
                    );
                } else if status == StatusCode::FORBIDDEN {
                    warn!(
                        event_type = "authorization_failure",
                        method = %method,
                        path = %path,
                        status = %status.as_u16(),
                        remote_addr = %remote_addr,
                        "Access forbidden"
                    );
                } else if status.is_success() && path.starts_with("/auth/login") {
                    info!(
                        event_type = "authentication_success",
                        method = %method,
                        path = %path,
                        status = %status.as_u16(),
                        remote_addr = %remote_addr,
                        "Authentication successful"
                    );
                }
            }

            result
        })
    }
}
