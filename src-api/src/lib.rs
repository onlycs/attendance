#![feature(never_type, error_generic_member_access)]
#![warn(clippy::pedantic)]
#![allow(clippy::similar_names, clippy::missing_errors_doc)]

#[macro_use]
extern crate tracing;

mod auth;
mod dbstream;
mod error;
mod prelude;
mod roster;
mod student;
mod telemetry;

use poem::{EndpointExt, Route, Server, listener::TcpListener, middleware::Cors};
use poem_openapi::OpenApiService;
use prelude::*;
use sqlx::PgPool;

pub fn oai(pg: PgPool) -> OpenApiService<impl OpenApi, ()> {
    OpenApiService::new(
        (
            auth::AuthService::new(pg.clone()),
            roster::RosterService::new(pg.clone()),
            student::StudentService::new(pg.clone()),
            telemetry::TelemetryService::new(pg.clone()),
        ),
        "Attendance API",
        &*env::PUBLIC_ADDRESS,
    )
}

pub async fn run_server(pool: PgPool) -> Result<(), InitError> {
    let address = format!("{}:{}", *env::ADDRESS, *env::PORT);
    let service = oai(pool);

    let app = Route::new()
        .nest("/docs", service.scalar())
        .nest("/openapi.yml", service.spec_endpoint_yaml())
        .nest("/", service)
        .with(Cors::new());

    Server::new(TcpListener::bind(address)).run(app).await?;

    Ok(())
}

pub use error::InitError;
pub use prelude::env::DATABASE_URL;
