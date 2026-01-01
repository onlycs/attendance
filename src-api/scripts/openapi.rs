use std::error::Error;

use attendance_api::oai;
use sqlx::PgPool;
use tokio::fs;

pub async fn inner() -> Result<(), Box<dyn Error>> {
    let pool = PgPool::connect(dotenvy_macro::dotenv!("DATABASE_URL")).await?;

    fs::write(
        concat!(env!("CARGO_MANIFEST_DIR"), "/openapi.yml"),
        oai(pool).spec_yaml(),
    )
    .await?;

    Ok(())
}

fn main() {
    tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(inner())
        .unwrap();
}
