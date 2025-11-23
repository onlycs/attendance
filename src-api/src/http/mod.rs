pub mod auth;
pub mod roster;
pub mod student;

use actix_web::{
    HttpRequest, HttpResponse, Responder,
    web::{self},
};
use roster::RosterRequest;
use serde_json::json;
use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

use crate::{AppState, prelude::*};

#[utoipa::path(
    post,
    path = "/auth/login/start",
    operation_id = "login::start",
    tag = "auth",
    description = "Starts the srp6a login process",
    responses(
        (status = 200, description = "Login started", body = auth::LoginStartResponse),
        (status = 500, description = "Internal server error", body = String)
    )
)]
#[post("/auth/login/start")]
pub(crate) async fn login_start(state: web::Data<AppState>) -> Result<impl Responder, RouteError> {
    let token = auth::login_start(&state.pg).await?;
    Ok(HttpResponse::Ok().json(token))
}

#[utoipa::path(
    post,
    path = "/auth/login/finish",
    operation_id = "login::finish",
    tag = "auth",
    description = "Finishes the srp6a login process",
    request_body = auth::LoginFinishRequest,
    responses(
        (status = 200, description = "Login finished", body = auth::LoginFinishResponse),
        (status = 401, description = "Incorrect credentials", body = String),
        (status = 500, description = "Internal server error", body = String)
    )
)]
#[post("/auth/login/finish")]
pub(crate) async fn login_finish(
    body: web::Json<auth::LoginFinishRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let res = auth::login_finish(body.into_inner(), &state.pg).await?;
    Ok(HttpResponse::Ok().json(res))
}

#[allow(unused_variables)]
#[post("/auth/register")]
pub(crate) async fn register_start(
    req: HttpRequest,
    body: web::Json<auth::RegisterRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    // auth::check_throw(auth::parse_header(&req)?, &state.pg).await?;
    // let res = auth::register_start(body.into_inner(), &state.pg).await?;

    // Ok(HttpResponse::Ok().json(res))
    Ok(HttpResponse::Forbidden().body("Routes to register are closed, temporarily"))
}

#[utoipa::path(
    get,
    path = "/auth",
    operation_id = "auth::validate",
    tag = "auth",
    description = "Checks if the provided token is valid",
    responses(
        (status = 200, description = "Token is valid"),
        (status = 401, description = "Token is invalid", body = String),
        (status = 500, description = "Internal server error", body = String)
    ),
    security(("Token" = []))
)]
#[get("/auth")]
pub(crate) async fn auth_validate(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    info!(
        event_type = "request",
        path = "/auth/valid",
        method = "get",
        "Requested token validation"
    );

    let token = auth::parse_header(&req)?;
    auth::validate(token, &state.pg).await?;

    Ok(HttpResponse::Ok())
}

#[utoipa::path(
    delete,
    path = "/auth",
    operation_id = "auth::deauthorize",
    tag = "auth",
    description = "Deauthorizes the provided token",
    responses(
        (status = 200, description = "Token deauthorized", body = String),
        (status = 500, description = "Internal server error", body = String)
    ),
    security(("Token" = []))
)]
#[delete("/auth")]
pub(crate) async fn deauthorize(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    info!(
        event_type = "request",
        path = "/auth",
        method = "delete",
        "Requested token deauthorization"
    );

    let token = auth::parse_header(&req)?;
    auth::deauthorize(token, &state.pg).await?;

    Ok(HttpResponse::Ok().json(json!({ "status": "ok" })))
}

#[utoipa::path(
    post,
    path = "/roster",
    operation_id = "roster::record",
    tag = "roster",
    description = "Records a roster entry (login/logout)",
    request_body = RosterRequest,
    responses(
        (status = 200, description = "Roster entry recorded", body = roster::RosterResponse),
        (status = 401, description = "Invalid token", body = String),
        (status = 400, description = "Invalid hour type", body = String),
        (status = 500, description = "Internal server error", body = String)
    ),
    security(("Token" = []))
)]
#[post("/roster")]
pub(crate) async fn roster_record(
    req: HttpRequest,
    body: web::Json<RosterRequest>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    info!(
        event_type = "request",
        path = "/roster",
        method = "post",
        "Entry submitted to roster"
    );

    auth::validate(&auth::parse_header(&req)?, &state.pg).await?;
    let res = roster::record(body.into_inner(), &state.pg).await?;

    Ok(HttpResponse::Ok().json(res))
}

#[utoipa::path(
    delete,
    path = "/roster",
    operation_id = "roster::clear",
    tag = "roster",
    responses(
        (status = 200, description = "Expired roster entries cleared", body = String),
        (status = 401, description = "Invalid token", body = String),
        (status = 500, description = "Internal server error", body = String)
    ),
    security(("Token" = []))
)]
#[delete("/roster")]
pub(crate) async fn roster_clear(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    auth::validate(&auth::parse_header(&req)?, &state.pg).await?;
    roster::delete_expired(&state.pg).await?;

    Ok(HttpResponse::Ok().json(json!({ "status": "ok" })))
}

#[utoipa::path(
    get,
    path = "/student/{id}",
    operation_id = "student::query",
    tag = "student",
    description = "Querys student hours",
    params(
        ("id" = String, Path, description = "The student's hashed ID")
    ),
    responses(
        (status = 200, description = "Student information fetched", body = student::Hours),
        (status = 404, description = "No such student", body = String),
        (status = 500, description = "Internal server error", body = String)
    )
)]
#[get("/student/{id}")]
pub(crate) async fn student_query(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    let res = student::info(path.into_inner(), &state.pg).await?;
    Ok(HttpResponse::Ok().json(res))
}

#[utoipa::path(
    post,
    path = "/student",
    operation_id = "student::add",
    tag = "student",
    description = "Adds a new student",
    request_body = student::StudentData,
    responses(
        (status = 200, description = "Student added", body = String),
        (status = 401, description = "Invalid token", body = String),
        (status = 500, description = "Internal server error", body = String)
    ),
    security(("Token" = []))
)]
#[post("/student")]
pub(crate) async fn student_add(
    req: HttpRequest,
    body: web::Json<student::StudentData>,
    state: web::Data<AppState>,
) -> Result<impl Responder, RouteError> {
    auth::validate(&auth::parse_header(&req)?, &state.pg).await?;
    student::add(body.into_inner(), &state.pg).await?;
    Ok(HttpResponse::Ok().json(json!({ "status": "ok" })))
}

#[get("/")]
pub(crate) async fn index() -> impl Responder {
    HttpResponse::PermanentRedirect()
        .append_header(("Location", "https://attendance.angad.page/"))
        .finish()
}

// generate openapi docs
#[derive(OpenApi)]
#[openapi(
    modifiers(&TokenSecurity),
    paths(
        login_start,
        login_finish,
        deauthorize,
        student_query,
        student_add,
        roster_record,
        roster_clear,
        auth_validate,
    ),
    tags(
        (name = "auth", description = "Authentication related endpoints"),
        (name = "student", description = "Student related endpoints"),
        (name = "roster", description = "Roster related endpoints")
    )
)]
pub struct ApiDoc;

pub struct TokenSecurity;

impl Modify for TokenSecurity {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = &mut openapi.components {
            components.add_security_scheme(
                "Token",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("token")
                        .description(Some(
                            "Token-based authentication. Provide the token in the Authorization header as 'Bearer <token>'.",
                        ))
                        .build()
                )
            );
        }
    }
}
