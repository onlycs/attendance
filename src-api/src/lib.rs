#![feature(never_type, error_generic_member_access)]
#![warn(clippy::pedantic)]
#![allow(clippy::similar_names, clippy::missing_errors_doc)]

#[macro_use]
extern crate tracing;

pub mod error;
pub mod headers;
pub mod http;
pub mod prelude;
pub mod serde;
pub mod ws;

use std::sync::Arc;

use actix_cors::Cors;
use actix_web::{
    App, HttpServer,
    web::{self, Data},
};
use sqlx::PgPool;
use tracing_actix_web::TracingLogger;

use crate::{headers::SecurityHeaders, prelude::*};

pub struct AppState {
    pub pg: Arc<PgPool>,
}

impl AppState {
    pub fn new(pg: Arc<PgPool>) -> Self {
        Self { pg }
    }
}

pub async fn run_server(pool: Arc<PgPool>) -> Result<(), InitError> {
    ws::init();

    HttpServer::new(move || {
        let pg = Arc::clone(&pool);
        let state = AppState::new(pg);

        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(TracingLogger::default())
            .wrap(SecurityHeaders)
            .app_data(Data::new(state))
            .service(http::index)
            .service(http::openapi)
            .service(http::register_start)
            .service(http::login_start)
            .service(http::login_finish)
            .service(http::deauthorize)
            .service(http::student_query)
            .service(http::student_add)
            .service(http::roster_record)
            .service(http::roster_clear)
            .service(http::auth_validate)
            .route("/ws", web::get().to(ws::ws))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await?;

    Ok(())
}
