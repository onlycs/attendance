use wasm_bindgen::prelude::*;

pub fn bytes<const N: usize>() -> [u8; N] {
    let mut buf = [0u8; N];
    getrandom::getrandom(&mut buf).unwrap();
    buf
}

#[wasm_bindgen(js_name = "random_bytes")]
pub fn vec(len: usize) -> Vec<u8> {
    let mut buf = vec![0u8; len];
    getrandom::getrandom(&mut buf).unwrap();
    buf
}
