pub mod auth;
pub mod roster;
pub mod student;

use actix_web::{
    HttpRequest, HttpResponse, Responder,
    web::{self},
};
use roster::RosterRequest;
use serde_json::json;

use crate::{AppState, prelude::*};

#[post("/auth/login/start")]
pub(crate) async fn login_start(state: web::Data<AppState>) -> Result<impl Responder, RouteError> {
    let token = auth::login_start(&state.pg).await?;
    Ok(HttpResponse::Ok().json(token))
}

#[post("/auth/login/finish")]
pub(crate) async fn login_finish(
    body: web::Json<auth::LoginFinishRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let res = auth::login_finish(body.into_inner(), &state.pg).await?;
    Ok(HttpResponse::Ok().json(res))
}

#[allow(unused_variables)]
#[post("/auth/register/start")]
pub(crate) async fn register_start(
    req: HttpRequest,
    body: web::Json<auth::RegisterStartRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    // auth::check_throw(auth::parse_header(&req)?, &state.pg).await?;
    // let res = auth::register_start(body.into_inner(), &state.pg).await?;

    // Ok(HttpResponse::Ok().json(res))
    Ok(HttpResponse::Forbidden().body("Routes to register are closed, temporarily"))
}

#[allow(unused_variables)]
#[post("/auth/register/finish")]
pub(crate) async fn register_finish(
    req: HttpRequest,
    body: web::Json<auth::RegisterFinish>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    // auth::check_throw(auth::parse_header(&req)?, &state.pg).await?;
    // auth::register_finish(body.into_inner(), &state.pg).await?;

    // Ok(HttpResponse::Ok().json(json!({ "status": "ok" })))
    Ok(HttpResponse::Forbidden().body("Routes to register are closed, temporarily"))
}

#[get("/auth/valid")]
pub(crate) async fn check_token(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let token = auth::parse_header(&req)?;
    let res = auth::check(token, &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[delete("/auth")]
pub(crate) async fn deauthorize(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let token = auth::parse_header(&req)?;
    auth::deauthorize(token, &state.pg).await?;

    Ok(HttpResponse::Ok().json(json!({ "status": "ok" })))
}

#[post("/roster")]
pub(crate) async fn record(
    req: HttpRequest,
    body: web::Json<RosterRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    auth::check_throw(&auth::parse_header(&req)?, &state.pg).await?;
    let res = roster::record(body.into_inner(), &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[delete("/roster")]
pub(crate) async fn clear(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    auth::check_throw(&auth::parse_header(&req)?, &state.pg).await?;
    roster::delete_expired(&state.pg).await?;

    Ok(HttpResponse::Ok().json(json!({ "status": "ok" })))
}

#[get("/student/{id}/hours")]
pub(crate) async fn student_hours(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let res = student::hours(path.into_inner(), &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[get("/student/{id}/exists")]
pub(crate) async fn student_exists(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let res = student::exists(path.into_inner(), &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[get("/")]
pub(crate) async fn index() -> impl Responder {
    HttpResponse::PermanentRedirect()
        .append_header(("Location", "https://attendance.angad.page/"))
        .finish()
}
