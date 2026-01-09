use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = "totp_generate")]
pub fn generate(secret: &str) -> Option<String> {
    let ts_seconds = js_sys::Date::now() as u64 / 1000;

    Some(
        totp_rs::TOTP::new(
            totp_rs::Algorithm::SHA1,
            6,
            1,
            30,
            totp_rs::Secret::Encoded(secret.to_string())
                .to_bytes()
                .ok()?,
        )
        .ok()?
        .generate(ts_seconds),
    )
}
