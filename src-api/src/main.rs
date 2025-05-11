#![feature(never_type)]

extern crate actix_cors;
extern crate actix_web;
extern crate chrono;
extern crate cuid;
extern crate dotenvy;
extern crate log;
extern crate serde;
extern crate simple_logger;
extern crate sqlx;
extern crate thiserror;

mod error;
mod http;
mod prelude;

use std::sync::Arc;

use crate::prelude::*;

use actix_cors::Cors;
use dotenvy::dotenv;
use log::LevelFilter;
use simple_logger::SimpleLogger;
use sqlx::{postgres::PgPoolOptions, PgPool};

use actix_web::{web::Data, App, HttpServer};

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
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(Data::new(AppState {
                pg: Arc::clone(&pool),
            }))
            .service(http::index)
            .service(http::login)
            .service(http::student_hours)
            .service(http::student_exists)
            .service(http::record)
            .service(http::clear)
            .service(http::check_token)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await?;

    Ok(())
}
