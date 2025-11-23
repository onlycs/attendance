use std::time::Instant;

use attendance_api::http::ApiDoc;
use utoipa::OpenApi;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let start = Instant::now();

    let openapi = ApiDoc::openapi();
    let yaml_content = openapi.to_yaml()?;
    let file_size = yaml_content.len();

    std::fs::write("openapi.yml", yaml_content)?;

    let duration = start.elapsed();

    println!(
        "🚀 \x1b[32mAPI → openapi.yml\x1b[0m \x1b[2m[{:.2}KiB in {:.2}ms]\x1b[0m",
        file_size as f32 / 1024.,
        duration.as_secs_f64() * 1000.0
    );

    Ok(())
}
