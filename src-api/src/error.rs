use std::{env::VarError, io, panic::Location};

use actix_web::{
    body::BoxBody,
    http::{header::ToStrError, StatusCode},
    HttpResponse, ResponseError,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum InitError {
    #[error("At {location}: Failed to connect to database:\n{source}")]
    DbError {
        #[from]
        source: sqlx::Error,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to launch server:\n{source}")]
    PoolError {
        #[from]
        source: io::Error,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to init logger:\n{source}")]
    LogError {
        #[from]
        source: log::SetLoggerError,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to get environment variable:\n{source}")]
    EnvError {
        #[from]
        source: VarError,
        location: &'static Location<'static>,
    },
}

#[derive(Error, Debug)]
pub enum RouteError {
    #[error("At {location}: SQLx failure:\n{source}")]
    SqlxError {
        #[from]
        source: sqlx::Error,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to convert header to string:\n{source}")]
    HeaderError {
        #[from]
        source: ToStrError,
        location: &'static Location<'static>,
    },

    #[error("At {location}: Failed to get environment variable:\n{source}")]
    EnvError {
        #[from]
        source: VarError,
        location: &'static Location<'static>,
    },

    #[error("No authorization header")]
    NoAuth,

    #[error("Invalid token or password")]
    InvalidToken,

    #[error("User already exists")]
    UserExists,
}

impl ResponseError for RouteError {
    fn status_code(&self) -> StatusCode {
        match self {
            RouteError::NoAuth => StatusCode::UNAUTHORIZED,
            RouteError::InvalidToken => StatusCode::UNAUTHORIZED,
            RouteError::UserExists => StatusCode::CONFLICT,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse<BoxBody> {
        match self {
            RouteError::NoAuth => HttpResponse::Unauthorized().body(format!("{self}")),
            RouteError::InvalidToken => HttpResponse::Unauthorized().body(format!("{self}")),
            RouteError::UserExists => HttpResponse::Conflict().body(format!("{self}")),
            _ => HttpResponse::InternalServerError().body(format!("{self}")),
        }
    }
}
