mod auth;
mod hours;
mod roster;

use crate::prelude::*;
use crate::AppState;
use actix_web::delete;
use actix_web::get;
use hours::HoursRequest;
use roster::RosterRequest;

use actix_web::{
    post,
    web::{self},
    HttpRequest, HttpResponse, Responder,
};

#[post("/auth")]
pub(crate) async fn login(
    body: web::Json<auth::TokenRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let req = body.into_inner();
    let token = auth::authorize(req, &state.pg).await?;

    Ok(HttpResponse::Ok().json(token))
}

#[get("/auth")]
pub(crate) async fn check_token(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let token = auth::parse_header(&req)?;
    let res = auth::check(token, &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[post("/roster")]
pub(crate) async fn record(
    req: HttpRequest,
    body: web::Json<RosterRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    auth::check_throw(auth::parse_header(&req)?, &state.pg).await?;
    let res = roster::record(body.into_inner(), &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[delete("/roster")]
pub(crate) async fn clear(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    auth::check_throw(auth::parse_header(&req)?, &state.pg).await?;
    roster::delete_expired(&state.pg).await?;

    Ok(HttpResponse::Ok().finish())
}

#[get("/hours")]
pub(crate) async fn student_hours(
    query: web::Query<HoursRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let res = hours::hours(query.into_inner(), &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[get("/")]
pub(crate) async fn index() -> impl Responder {
    HttpResponse::PermanentRedirect()
        .append_header(("Location", "https://attendance.angad.page/"))
        .finish()
}
