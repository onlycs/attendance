#![feature(never_type, error_generic_member_access, if_let_guard)]
#![warn(clippy::pedantic)]
#![allow(clippy::similar_names, clippy::missing_errors_doc)]

#[macro_use]
extern crate tracing;

mod admin;
mod auth;
mod dbstream;
mod error;
mod prelude;
mod roster;
mod student;
mod telemetry;

#[cfg(all(not(debug_assertions), feature = "serve-static"))]
use poem::endpoint::StaticFilesEndpoint;
use poem::{EndpointExt, Route, Server, listener::TcpListener, middleware::Cors};
use poem_openapi::OpenApiService;
use prelude::*;
use sqlx::PgPool;

pub fn oai(pg: PgPool) -> OpenApiService<impl OpenApi, ()> {
    OpenApiService::new(
        (
            admin::AdminService::new(pg.clone()),
            auth::AuthService::new(pg.clone()),
            roster::HourTypeService::new(pg.clone()),
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

    let app = Route::new();

    #[cfg(any(debug_assertions, not(feature = "serve-static")))]
    let app = app
        .nest("/docs", service.scalar())
        .nest("/openapi.yml", service.spec_endpoint_yaml())
        .nest("/", service)
        .with(Cors::new());

    #[cfg(all(not(debug_assertions), feature = "serve-static"))]
    let app = app
        .nest("/api/docs", service.scalar())
        .nest("/api/openapi.yml", service.spec_endpoint_yaml())
        .nest("/api/", service)
        .nest(
            "/",
            StaticFilesEndpoint::new("static")
                .index_file("index.html")
                .map_to_response()
                .after(|res| async move {
                    use poem::IntoResponse;

                    Ok(res?
                        .with_header("cross-origin-opener-policy", "same-origin")
                        .with_header("cross-origin-embedder-policy", "require-corp"))
                }),
        )
        .with(Cors::new());

    Server::new(TcpListener::bind(address)).run(app).await?;

    Ok(())
}

pub use error::InitError;
pub use prelude::env::DATABASE_URL;
