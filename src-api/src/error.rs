use std::{env::VarError, io, panic::Location};

use actix_web::{
    body::BoxBody,
    http::{header::ToStrError, StatusCode},
    HttpResponse, ResponseError,
};
use thiserror::Error;

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

    #[error("Cannot log build hours between September and December")]
    NoBuildHours,

    #[error("Cannot log learning hours between January and August")]
    NoLearningHours,
}

impl ResponseError for RouteError {
    fn status_code(&self) -> StatusCode {
        match self {
            RouteError::NoAuth | RouteError::InvalidToken => StatusCode::UNAUTHORIZED,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse<BoxBody> {
        match self {
            RouteError::NoAuth | RouteError::InvalidToken => {
                HttpResponse::Unauthorized().body(format!("{self}"))
            }
            _ => HttpResponse::InternalServerError().body(format!("{self}")),
        }
    }
}
