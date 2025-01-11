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
mod model;
mod prelude;
mod routes;

use std::sync::Arc;

use crate::model::*;
use crate::prelude::*;

use actix_cors::Cors;
use actix_web::get;
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
        WHERE created_at > NOW() - INTERVAL '10 hours' and token = $1
        "#,
        token
    )
    .fetch_optional(pg)
    .await?
    else {
        if env::var("ADMIN_HASH")? == sha256::digest(&token) {
            return Ok(());
        }

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

#[post("/roster")]
async fn roster(
    req: HttpRequest,
    body: web::Json<RosterRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    authorize(get_auth_header(&req)?, &state.pg).await?;

    let RosterRequest { id, force } = body.into_inner();
    let res = routes::roster(id, force, &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[post("/clear")]
async fn clear(req: HttpRequest, state: web::Data<AppState>) -> Result<impl Responder, RouteError> {
    authorize(get_auth_header(&req)?, &state.pg).await?;

    sqlx::query!(
        r#"
        DELETE FROM records
        WHERE in_progress = true
        "#
    )
    .execute(&*state.pg)
    .await?;

    Ok(HttpResponse::Ok().finish())
}

#[get("/hours")]
async fn hours(
    query: web::Query<HoursRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let HoursRequest { id } = query.into_inner();
    let (learning, build) = routes::hours(id, &state.pg).await?;

    Ok(HttpResponse::Ok().json(HoursResponse { learning, build }))
}

#[get("/hours.csv")]
async fn csv(
    query: web::Query<CSVRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let CSVRequest { json, token } = query.into_inner();

    authorize(token, &state.pg).await?;
    let csv = routes::csv(&state.pg).await?;

    if json {
        Ok(HttpResponse::Ok().json(CSVResponse { csv }))
    } else {
        Ok(HttpResponse::Ok().body(csv))
    }
}

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::PermanentRedirect()
        .append_header(("Location", "https://attendance.angad.page/"))
        .finish()
}

// Arc makes this safe (static arc == box::leak but you can use it anywhere)
static mut POOL: Option<Arc<PgPool>> = None;

#[allow(static_mut_refs)]
async fn get_pool() -> Arc<PgPool> {
    if let Some(pool) = unsafe { POOL.as_ref() } {
        Arc::clone(&pool)
    } else {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&env::var("DATABASE_URL").unwrap())
            .await
            .unwrap();

        let pool = Arc::new(pool);

        unsafe { POOL = Some(Arc::clone(&pool)) }

        pool
    }
}

#[actix_web::main]
async fn main() -> Result<(), InitError> {
    SimpleLogger::new().with_level(LevelFilter::Debug).init()?;
    dotenv().ok();

    let pool = get_pool().await;

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
            .service(index)
            .service(login)
            .service(hours)
            .service(roster)
            .service(csv)
            .service(clear)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await?;

    Ok(())
}
