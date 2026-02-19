use snafu::Whatever;
use wasm_bindgen::prelude::*;

use crate::ResultExt;

pub fn bytes<const N: usize>() -> Result<[u8; N], Whatever> {
    let mut buf = [0u8; N];
    getrandom::getrandom(&mut buf).ctx("RNG failed")?;
    Ok(buf)
}

pub fn vec(len: usize) -> Result<Vec<u8>, Whatever> {
    let mut buf = vec![0u8; len];
    getrandom::getrandom(&mut buf).ctx("RNG failed")?;
    Ok(buf)
}

#[wasm_bindgen(js_name = "random_bytes")]
pub fn random_bytes(len: usize) -> Option<Vec<u8>> {
    vec(len).log_ok()
}
