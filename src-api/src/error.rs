use std::{io, panic::Location};

use actix_web::{body::BoxBody, http::StatusCode, HttpResponse, ResponseError};
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
}

#[derive(Error, Debug)]
pub enum RouteError {
    #[error("At {location}: SQLx failure:\n{source}")]
    SqlxError {
        #[from]
        source: sqlx::Error,
        location: &'static Location<'static>,
    },
}

impl ResponseError for RouteError {
    fn status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }

    fn error_response(&self) -> HttpResponse<BoxBody> {
        HttpResponse::InternalServerError().body(format!("{self:?}"))
    }
}
