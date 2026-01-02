use std::{env::VarError, fmt, io, panic::Location};

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

pub(crate) trait LogError<E>: Sized {
    fn log(self)
    where
        E: fmt::Display;

    fn dbg(self)
    where
        E: fmt::Debug;
}

impl<T, E> LogError<E> for Result<T, E> {
    #[track_caller]
    fn log(self)
    where
        E: fmt::Display,
    {
        let Err(e) = self else {
            return;
        };

        error!(
            source = %e,
            location = %Location::caller(),
            "Caught an error"
        );
    }

    #[track_caller]
    fn dbg(self)
    where
        E: fmt::Debug,
    {
        let Err(e) = self else {
            return;
        };

        error!(
            source = ?e,
            location = %Location::caller(),
            "Caught an error"
        )
    }
}
