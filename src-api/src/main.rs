#![feature(never_type, error_generic_member_access)]

extern crate actix_cors;
extern crate actix_web;
extern crate actix_ws;
extern crate bcrypt;
extern crate chrono;
extern crate chrono_tz;
extern crate cuid;
extern crate dotenvy;
extern crate futures_util;
extern crate itertools;
#[macro_use]
extern crate log;
extern crate serde;
extern crate serde_json;
extern crate serde_with;
extern crate simple_logger;
extern crate sqlx;
extern crate thiserror;
extern crate time;

mod error;
mod http;
mod prelude;
mod ws;

use std::sync::Arc;

use actix_cors::Cors;
use actix_web::{
    web::{self, Data},
    App, HttpServer,
};
use dotenvy::dotenv;
use log::LevelFilter;
use simple_logger::SimpleLogger;
use sqlx::{postgres::PgPoolOptions, PgPool};

use crate::prelude::*;

pub struct AppState {
    pub pg: Arc<PgPool>,
}

#[actix_web::main]
async fn main() -> Result<(), InitError> {
    SimpleLogger::new()
        .with_colors(true)
        .with_threads(true)
        .with_local_timestamps()
        .with_timestamp_format(time::macros::format_description!(
            "[year]-[month]-[day] [hour]:[minute]:[second].[subsecond digits:3]"
        ))
        .with_level(LevelFilter::Debug)
        .init()?;

    dotenv().ok();

    let pool = Arc::new(
        PgPoolOptions::new()
            .max_connections(5)
            .connect(&env::var("DATABASE_URL").unwrap())
            .await?,
    );

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
            .app_data(Data::new(AppState { pg }))
            .service(http::index)
            .service(http::login)
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
