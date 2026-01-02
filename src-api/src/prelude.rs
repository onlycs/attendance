#[rustfmt::skip]
pub mod env {
    macro_rules! static_env {
        ($vis:vis $env:ident) => {
            $vis static $env: ::std::sync::LazyLock<String> = ::std::sync::LazyLock::new(|| {
                std::env::var(stringify!($env)).expect(concat!(stringify!($env), " must be set"))
            });
        };

        ($vis:vis $env:ident or $default:expr) => {
            $vis static $env: ::std::sync::LazyLock<String> = ::std::sync::LazyLock::new(|| {
                std::env::var(stringify!($env)).unwrap_or_else(|_| $default.to_string())
            });
        };
    }

    const _PUBLIC_ADDRESS: &str = if cfg!(debug_assertions) { "http://localhost:8080" } else { "https://api.attendance.angad.page" };

    static_env!(pub DATABASE_URL);
    static_env!(pub(crate) JWT_SECRET);
    static_env!(pub(crate) PORT or 8080);
    static_env!(pub(crate) ADDRESS or "0.0.0.0");
    static_env!(pub(crate) PUBLIC_ADDRESS or _PUBLIC_ADDRESS);
}

pub trait DateTimeExt {
    fn and_local(&self) -> chrono::DateTime<chrono::Local>;
}

impl DateTimeExt for chrono::DateTime<Utc> {
    /// Cast a `NaiveDateTime` in UTC to a `DateTime<Local>`.
    fn and_local(&self) -> chrono::DateTime<chrono::Local> {
        self.with_timezone(&chrono::Local)
    }
}

#[derive(poem_openapi::Tags)]
pub(crate) enum Tag {
    Auth,
    Roster,
    Student,
    Telemetry,
}

pub(crate) use attendance_api_macro::auto_operation_ids;
pub(crate) use chrono::{Local, Utc};
pub(crate) use cuid::cuid2;
pub(crate) use futures_util::StreamExt;
pub(crate) use oade::ApiError;
pub(crate) use poem_openapi::{
    ApiResponse, Enum, Object, OpenApi,
    param::{Path, Query},
    payload::{Json, PlainText},
};
pub(crate) use serde::{Deserialize, Serialize};
pub(crate) use sqlx::PgPool;

pub(crate) use crate::{
    auth::{Jwt, JwtVerifyError, Permission, PermissionDeniedError},
    dbstream,
    error::LogError,
    roster::HourType,
};
