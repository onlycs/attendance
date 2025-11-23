#![feature(never_type, error_generic_member_access)]

use std::sync::Arc;

use attendance_api::{prelude::*, run_server};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::{filter::Targets, layer::SubscriberExt, util::SubscriberInitExt};

#[actix_web::main]
async fn main() -> Result<(), InitError> {
    #[cfg(debug_assertions)]
    const LOG_LEVEL: tracing::Level = tracing::Level::DEBUG;
    #[cfg(not(debug_assertions))]
    const LOG_LEVEL: tracing::Level = tracing::Level::INFO;

    #[cfg(debug_assertions)]
    let fmt = tracing_subscriber::fmt::layer().pretty();
    #[cfg(not(debug_assertions))]
    let fmt = tracing_subscriber::fmt::layer().json();

    let filter = Targets::new()
        .with_default(LOG_LEVEL)
        .with_target("sqlx", tracing::Level::DEBUG);

    tracing_subscriber::registry().with(filter).with(fmt).init();
    dotenv().ok();

    let pool = Arc::new(
        PgPoolOptions::new()
            .max_connections(5)
            .connect(&env::var("DATABASE_URL").unwrap())
            .await?,
    );

    run_server(pool).await
}
