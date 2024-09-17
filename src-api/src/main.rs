use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use cuid::cuid2;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool, Pool, Postgres};

const ADMIN_HASH: &str = "d168c550ddff8635f490d9552e6359ee86741180021c1321f870969b6de3285c";

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[derive(Deserialize)]
struct AttendRequest {
    auth: String,
    id: i32,
}

#[derive(Deserialize)]
struct AuthRequest {
    passwd: String,
}

#[derive(Serialize)]
struct AuthResponse {
    token: String,
}

struct AppState {
    pg: Pool<Postgres>,
}

#[post("/attendance")]
async fn attend(body: web::Json<AttendRequest>, state: web::Data<AppState>) -> impl Responder {
    let AttendRequest { auth, id } = body.into_inner();

    if !authorize(auth, &state.pg).await {
        return HttpResponse::Unauthorized().finish();
    }

    let record = sqlx::query!(
        r#"
        SELECT id FROM records
        WHERE student_id = $1 and in_progress = true
        "#,
        id
    )
    .fetch_optional(&state.pg)
    .await
    .unwrap();

    if let Some(record) = record {
        sqlx::query!(
            r#"
            UPDATE records
            SET in_progress = false, sign_out = NOW()
            WHERE id = $1
            "#,
            record.id
        )
        .execute(&state.pg)
        .await
        .unwrap();
    } else {
        sqlx::query!(
            r#"
            INSERT INTO records (id, student_id, sign_in)
            VALUES ($1, $2, NOW())
            "#,
            cuid2(),
            id
        )
        .execute(&state.pg)
        .await
        .unwrap();
    }

    HttpResponse::Ok().finish()
}

async fn authorize(token: String, pg: &PgPool) -> bool {
    let token = sqlx::query!(
        r#"
        SELECT * FROM tokens
        WHERE created_at > NOW() - INTERVAL '5 hours' and token = $1
        "#,
        token
    )
    .fetch_optional(pg)
    .await
    .unwrap();

    token.is_some()
}

#[post("/login")]
async fn login(body: web::Json<AuthRequest>, state: web::Data<AppState>) -> impl Responder {
    let AuthRequest { passwd } = body.into_inner();
    let hashed = sha256::digest(passwd.as_bytes());

    if hashed != ADMIN_HASH {
        return HttpResponse::Unauthorized().finish();
    }

    let token = sqlx::query!(
        r#"
        SELECT * FROM tokens
        WHERE created_at > NOW() - INTERVAL '5 hours'
        "#
    )
    .fetch_optional(&state.pg)
    .await
    .unwrap();

    let token = if let Some(tkn) = token {
        tkn.token
    } else {
        sqlx::query!(
            r#"
            DELETE FROM tokens
            "#
        )
        .execute(&state.pg)
        .await
        .unwrap();

        let record = sqlx::query!(
            r#"
            INSERT INTO tokens (token)
            values ($1)
            returning token
            "#,
            cuid2()
        )
        .fetch_one(&state.pg)
        .await
        .unwrap();

        record.token
    };

    HttpResponse::Ok().json(AuthResponse { token })
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
