use actix_web::{get, post, web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use serde::Deserialize;
use serde_json::json;
use sqlx::{postgres::PgPoolOptions, PgPool, Pool, Postgres};

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[derive(Deserialize)]
struct AttendRequest {
    auth: String,
    id: u32,
}

struct AppState {
    pg: Pool<Postgres>,
}

#[post("/attendance")]
async fn attend(
    req: HttpRequest,
    body: web::Json<AttendRequest>,
    state: web::Data<AppState>,
) -> impl Responder {
    let AttendRequest { auth, id } = body.into_inner();

    HttpResponse::Ok()
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(dotenvy_macro::dotenv!("DATABASE_URL"))
        .await
        .unwrap();

    HttpServer::new(move || {
        App::new()
            .app_data(AppState { pg: pool.clone() })
            .service(attend)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
