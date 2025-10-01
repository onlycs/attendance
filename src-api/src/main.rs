#![feature(never_type, error_generic_member_access)]
#![warn(clippy::pedantic)]
#![allow(clippy::similar_names, clippy::missing_errors_doc)]

#[macro_use]
extern crate tracing;

pub mod error;
pub mod http;
pub mod middleware;
pub mod prelude;
pub mod serde;
pub mod ws;

use std::sync::Arc;

use actix_cors::Cors;
use actix_governor::Governor;
use actix_web::{
    App, HttpServer,
    web::{self, Data},
};
use dotenvy::dotenv;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tracing::level_filters::LevelFilter;

use crate::{
    middleware::{ErrorLog, RequestLog, SecurityHeaders},
    prelude::*,
};

pub struct AppState {
    pub pg: Arc<PgPool>,
}

#[actix_web::main]
async fn main() -> Result<(), InitError> {
    if cfg!(debug_assertions) {
        // Development: pretty formatted logs with debug level
        tracing_subscriber::fmt()
            .pretty()
            .with_max_level(LevelFilter::DEBUG)
            .with_thread_names(true)
            .with_level(true)
            .init();
    } else {
        // Production: one-line compact logs for better parsing and OWASP compliance
        tracing_subscriber::fmt()
            .compact()
            .with_max_level(LevelFilter::INFO)
            .with_target(false)
            .with_thread_names(false)
            .init();
    }

    dotenv().ok();

    let pool = Arc::new(
        PgPoolOptions::new()
            .max_connections(5)
            .connect(&env::var("DATABASE_URL").unwrap())
            .await?,
    );

    let gov = actix_governor::GovernorConfigBuilder::default()
        .seconds_per_request(5)
        .burst_size(10)
        .finish()
        .expect("Unreachable: Fully configured governor");

    // spawn blocking on current thread
    HttpServer::new(move || {
        let pg = Arc::clone(&pool);
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Governor::new(&gov))
            .wrap(ErrorLog)
            .wrap(RequestLog)
            .wrap(SecurityHeaders)
            .app_data(Data::new(AppState { pg }))
            .service(http::index)
            .service(http::register_start)
            .service(http::register_finish)
            .service(http::login_start)
            .service(http::login_finish)
            .service(http::student_hours)
            .service(http::student_exists)
            .service(http::record)
            .service(http::clear)
            .service(http::check_token)
            .route("/ws", web::get().to(ws::ws))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await?;

    Ok(())
}
