use std::future::{Ready, ready};

use actix_web::{
    Error, Result,
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
};
use futures_util::future::LocalBoxFuture;
use tracing::{error, info, warn};

use crate::error::RouteError;

pub struct ErrorLog;

impl<S, B> Transform<S, ServiceRequest> for ErrorLog
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Error = Error;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;
    type InitError = ();
    type Response = ServiceResponse<B>;
    type Transform = ErrorLogService<S>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ErrorLogService { service }))
    }
}

pub struct ErrorLogService<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for ErrorLogService<S>
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

        let fut = self.service.call(req);

        Box::pin(async move {
            let start_time = std::time::Instant::now();
            let res = fut.await;
            let duration = start_time.elapsed();

            match &res {
                Ok(response) => {
                    let status = response.status();

                    if status.is_success() {
                        info!(
                            method = %method,
                            path = %path,
                            status = %status.as_u16(),
                            duration_ms = %duration.as_millis(),
                            remote_addr = %remote_addr,
                            "Request completed successfully"
                        );
                    } else if status.is_client_error() {
                        warn!(
                            method = %method,
                            path = %path,
                            status = %status.as_u16(),
                            duration_ms = %duration.as_millis(),
                            remote_addr = %remote_addr,
                            "Client error occurred"
                        );
                    } else if status.is_server_error() {
                        error!(
                            method = %method,
                            path = %path,
                            status = %status.as_u16(),
                            duration_ms = %duration.as_millis(),
                            remote_addr = %remote_addr,
                            "Server error occurred"
                        );
                    }
                }
                Err(err) => {
                    // Check if it's our custom RouteError
                    if let Some(route_error) = err.as_error::<RouteError>() {
                        match route_error {
                            RouteError::BadAuth => {
                                warn!(
                                    method = %method,
                                    path = %path,
                                    error_type = "authentication_failure",
                                    duration_ms = %duration.as_millis(),
                                    remote_addr = %remote_addr,
                                    "Authentication failed"
                                );
                            }
                            RouteError::HourType { .. } => {
                                warn!(
                                    method = %method,
                                    path = %path,
                                    error_type = "invalid_hour_type",
                                    duration_ms = %duration.as_millis(),
                                    remote_addr = %remote_addr,
                                    "Invalid hour type submitted"
                                );
                            }
                            _ => {
                                error!(
                                    method = %method,
                                    path = %path,
                                    error_type = "internal_error",
                                    duration_ms = %duration.as_millis(),
                                    remote_addr = %remote_addr,
                                    "Internal server error occurred"
                                );
                            }
                        }
                    } else {
                        error!(
                            method = %method,
                            path = %path,
                            error_type = "unknown_error",
                            duration_ms = %duration.as_millis(),
                            remote_addr = %remote_addr,
                            "Unexpected error occurred"
                        );
                    }
                }
            }

            res
        })
    }
}
