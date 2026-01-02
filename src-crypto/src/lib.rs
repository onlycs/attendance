pub mod argon2;
pub mod random;

use std::fmt;

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

pub trait LogError<T, E: fmt::Debug> {
    fn dbg_ok(self) -> Option<T>;
}

impl<T, E: fmt::Debug> LogError<T, E> for Result<T, E> {
    fn dbg_ok(self) -> Option<T> {
        match self {
            Ok(v) => Some(v),
            Err(e) => {
                error(&format!("Error: {:?}", e));
                None
            }
        }
    }
}
