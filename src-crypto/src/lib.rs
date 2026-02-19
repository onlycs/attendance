pub mod argon2;
pub mod random;
pub mod totp;

use std::{fmt, panic::Location};

use snafu::ErrorCompat;
use wasm_bindgen::prelude::*;
pub use wasm_bindgen_rayon::init_thread_pool;

#[wasm_bindgen(start)]
fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}

pub trait ResultExt<T, E: fmt::Display>: Sized {
    fn ctx(self, msg: &str) -> Result<T, snafu::Whatever>;
    fn log_ok(self) -> Option<T>;
    fn log_ok_ctx(self, msg: &str) -> Option<T> {
        self.ctx(msg).trace_ok()
    }
}

pub trait WhateverExt<T> {
    fn trace_ok(self) -> Option<T>;
}

impl<T, E: fmt::Display> ResultExt<T, E> for Result<T, E> {
    fn ctx(self, msg: &str) -> Result<T, snafu::Whatever> {
        match self {
            Ok(val) => Ok(val),
            Err(e) => snafu::whatever!("{}: {e}", msg),
        }
    }

    #[track_caller]
    fn log_ok(self) -> Option<T> {
        match self {
            Ok(val) => Some(val),
            Err(e) => {
                error(&format!("At {}: {e}", Location::caller()));
                None
            }
        }
    }
}

impl<T> WhateverExt<T> for Result<T, snafu::Whatever> {
    #[track_caller]
    fn trace_ok(self) -> Option<T> {
        match self {
            Ok(val) => Some(val),
            Err(e) => {
                error(&format!("At {}: {e}", Location::caller()));
                if let Some(backtrace) = ErrorCompat::backtrace(&e) {
                    error(&format!("Backtrace:\n{backtrace}"));
                }

                None
            }
        }
    }
}
