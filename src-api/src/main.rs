#![feature(never_type)]

extern crate actix_cors;
extern crate actix_web;
extern crate cuid;
extern crate dotenvy;
extern crate log;
extern crate serde;
extern crate simple_logger;
extern crate sqlx;
extern crate thiserror;

mod error;
mod model;
mod prelude;
mod routes;

use crate::model::*;
use crate::prelude::*;

use actix_cors::Cors;
use dotenvy::dotenv;
use log::LevelFilter;
use simple_logger::SimpleLogger;
use sqlx::{postgres::PgPoolOptions, PgPool};

use actix_web::{
    post,
    web::{self, Data},
    App, HttpRequest, HttpResponse, HttpServer, Responder,
};

pub async fn authorize(token: String, pg: &PgPool) -> Result<(), RouteError> {
    let token = token.replacen("Bearer ", "", 1);

    let Some(_) = sqlx::query!(
        r#"
        SELECT * FROM tokens
        WHERE created_at > NOW() - INTERVAL '5 hours' and token = $1
        "#,
        token
    )
    .fetch_optional(pg)
    .await?
    else {
        return Err(RouteError::InvalidToken);
    };

    Ok(())
}

pub fn get_auth_header(req: &HttpRequest) -> Result<String, RouteError> {
    let auth_header = req.headers().get("Authorization");

    let Some(auth) = auth_header else {
        return Err(RouteError::NoAuth);
    };

    Ok(auth.to_str()?.to_string())
}

#[post("/login")]
async fn login(
    body: web::Json<AuthRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let password = body.into_inner().password;
    let token = routes::login(password, &state.pg).await?;

    Ok(HttpResponse::Ok().json(AuthResponse { token }))
}

#[post("/exists")]
async fn exists(
    req: HttpRequest,
    body: web::Json<ExistsRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    authorize(get_auth_header(&req)?, &state.pg).await?;

    let id = body.into_inner().id;
    let exists = routes::exists(id, &state.pg).await?;

    Ok(HttpResponse::Ok().json(ExistsResponse { exists }))
}

#[post("/register")]
async fn register(
    req: HttpRequest,
    body: web::Json<RegisterRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    authorize(get_auth_header(&req)?, &state.pg).await?;

    let RegisterRequest { id, name } = body.into_inner();
    routes::register(id, name, &state.pg).await?;

    Ok(HttpResponse::Ok().finish())
}

#[post("/log")]
async fn student_login(
    req: HttpRequest,
    body: web::Json<AttendRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    authorize(get_auth_header(&req)?, &state.pg).await?;

    let AttendRequest { id } = body.into_inner();
    routes::log(id, &state.pg).await?;

    Ok(HttpResponse::Ok().finish())
}

#[actix_web::main]
async fn main() -> Result<(), InitError> {
    SimpleLogger::new().with_level(LevelFilter::Debug).init()?;
    dotenv()?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&env::var("DATABASE_URL")?)
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
            .service(login)
            .service(exists)
            .service(register)
            .service(student_login)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await?;

    Ok(())
}
