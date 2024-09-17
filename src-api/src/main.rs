#![feature(never_type)]

mod error;
mod model;

use crate::model::*;
use actix_cors::Cors;
use actix_web::{
    post,
    web::{self, Data},
    App, HttpResponse, HttpServer, Responder,
};
use cuid::cuid2;
use dotenvy_macro::dotenv;
use error::{InitError, RouteError};
use log::LevelFilter;
use simple_logger::SimpleLogger;
use sqlx::{postgres::PgPoolOptions, PgPool};

const ADMIN_HASH: &str = dotenv!("ADMIN_PASSWORD");

async fn authorize(token: String, pg: &PgPool) -> Result<bool, RouteError> {
    let token = sqlx::query!(
        r#"
        SELECT * FROM tokens
        WHERE created_at > NOW() - INTERVAL '5 hours' and token = $1
        "#,
        token
    )
    .fetch_optional(pg)
    .await?;

    Ok(token.is_some())
}

#[post("/attendance")]
async fn attend(
    body: web::Json<AttendRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let AttendRequest { auth, id } = body.into_inner();

    if !authorize(auth, &state.pg).await? {
        return Ok(HttpResponse::Unauthorized().finish());
    }

    let record = sqlx::query!(
        r#"
        SELECT id FROM records
        WHERE student_id = $1 and in_progress = true
        "#,
        id
    )
    .fetch_optional(&state.pg)
    .await?;

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
        .await?;
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
        .await?;
    }

    Ok(HttpResponse::Ok().finish())
}

#[post("/login")]
async fn login(
    body: web::Json<AuthRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let AuthRequest { password } = body.into_inner();
    let hashed = sha256::digest(password.as_bytes());

    if hashed != ADMIN_HASH {
        return Ok(HttpResponse::Unauthorized().finish());
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
        .await?;

        let record = sqlx::query!(
            r#"
            INSERT INTO tokens (token)
            values ($1)
            returning token
            "#,
            cuid2()
        )
        .fetch_one(&state.pg)
        .await?;

        record.token
    };

    Ok(HttpResponse::Ok().json(AuthResponse { token }))
}

#[actix_web::main]
async fn main() -> Result<!, InitError> {
    SimpleLogger::new().with_level(LevelFilter::Debug).init()?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(dotenvy_macro::dotenv!("DATABASE_URL"))
        .await?;

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(Data::new(AppState { pg: pool.clone() }))
            .service(attend)
            .service(login)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await?;

    unreachable!()
}
