use std::{env::VarError, io, panic::Location};

use actix_web::{
    HttpResponse, ResponseError,
    body::BoxBody,
    http::{StatusCode, header::ToStrError},
};
use srp::types::SrpAuthError;
use thiserror::Error;

use crate::http::roster::HourType;

#[derive(Error, Debug)]
pub enum InitError {
    #[error("At {location}: Failed to connect to database: {source}")]
    Db {
        #[from]
        source: sqlx::Error,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to launch server: {source}")]
    Pool {
        #[from]
        source: io::Error,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to get environment variable: {source}")]
    Env {
        #[from]
        source: VarError,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to start dotenv: {source}")]
    Dotenv {
        #[from]
        source: dotenvy::Error,
        location: &'static Location<'static>,
    },

    #[error("Failed to initialize rate limiter")]
    RateLimiter,
}

#[derive(Error, Debug)]
pub enum WsServerError {
    #[error("At {location}: Failed to connect to database: {source}")]
    Db {
        #[from]
        source: sqlx::Error,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to get environment variable: {source}")]
    Env {
        #[from]
        source: VarError,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to format: {source}")]
    Format {
        #[from]
        source: std::fmt::Error,
        location: &'static Location<'static>,
    },
}

#[derive(Error, Debug)]
pub enum RouteError {
    #[error("At {location}: SQLx failure: {source}")]
    Sqlx {
        #[from]
        source: sqlx::Error,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to convert header to string: {source}")]
    Header {
        #[from]
        source: ToStrError,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to get environment variable: {source}")]
    Env {
        #[from]
        source: VarError,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to parse hex string: {source}")]
    FromHex {
        #[from]
        source: hex::FromHexError,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Reqwest failure: {source}")]
    Reqwest {
        #[from]
        source: reqwest::Error,
        location: &'static Location<'static>,
    },

    #[error("Invalid credentials")]
    BadAuth,

    #[error("Invalid hour type: cannot log {hour_type} hours right now")]
    HourType { hour_type: HourType },

    #[error("No such student")]
    StudentNotFound,
}

impl ResponseError for RouteError {
    fn status_code(&self) -> StatusCode {
        match self {
            RouteError::BadAuth => StatusCode::UNAUTHORIZED,
            RouteError::HourType { .. } => StatusCode::BAD_REQUEST,
            RouteError::StudentNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse<BoxBody> {
        match self {
            RouteError::BadAuth => HttpResponse::Unauthorized().body(format!("{self}")),
            RouteError::HourType { .. } => HttpResponse::BadRequest().body(format!("{self}")),
            RouteError::StudentNotFound => HttpResponse::NotFound().body(format!("{self}")),
            _ => HttpResponse::InternalServerError().body(format!("{self}")),
        }
    }
}

impl From<SrpAuthError> for RouteError {
    fn from(_: SrpAuthError) -> Self {
        RouteError::BadAuth
    }
}
