use std::{env::VarError, io, panic::Location};

use actix_web::{
    HttpResponse, ResponseError,
    body::BoxBody,
    http::{StatusCode, header::ToStrError},
};
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

    #[error("No token or password provided")]
    NoAuth,

    #[error("Invalid token or password")]
    InvalidToken,

    #[error("Invalid hour type: cannot log {hour_type} hours {}", hour_type.when_invalid())]
    HourType { hour_type: HourType },
}

impl ResponseError for RouteError {
    fn status_code(&self) -> StatusCode {
        match self {
            RouteError::NoAuth | RouteError::InvalidToken => StatusCode::UNAUTHORIZED,
            RouteError::HourType { .. } => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse<BoxBody> {
        match self {
            RouteError::NoAuth | RouteError::InvalidToken => {
                HttpResponse::Unauthorized().body(format!("{self}"))
            }
            RouteError::HourType { .. } => HttpResponse::BadRequest().body(format!("{self}")),
            _ => HttpResponse::InternalServerError().body(format!("{self}")),
        }
    }
}
