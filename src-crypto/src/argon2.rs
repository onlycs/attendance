use argon2::{Argon2, Params};
use chacha20poly1305::{KeyInit, XChaCha20Poly1305, XNonce, aead::Aead};
use rayon::iter::{IntoParallelIterator, ParallelIterator};
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{LogError, random};

// argon2id parameters
const MEMORY_COST: u32 = 128 * 1024;
const TIME_COST: u32 = 3;
const PARALLELISM: u32 = 4;

// other parameters
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 24;

fn argon2(password: &str, salt: &[u8; SALT_LEN]) -> Result<[u8; 32], argon2::Error> {
    let params = Params::new(MEMORY_COST, TIME_COST, PARALLELISM, None)?;
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
    let mut kek = [0u8; 32];

    argon2.hash_password_into(password.as_bytes(), salt, &mut kek)?;
    Ok(kek)
}

#[wasm_bindgen(js_name = "k1_encrypt")]
pub fn encrypt_k1(k1: &[u8], password: String) -> Option<String> {
    let salt = random::bytes::<SALT_LEN>();
    let nonce = XNonce::from(random::bytes::<NONCE_LEN>());

    let kek = argon2(&password, &salt).dbg_ok()?;
    let cipher = XChaCha20Poly1305::new_from_slice(&kek).dbg_ok()?;
    let ciphertext = cipher.encrypt(&nonce, k1).dbg_ok()?;

    let mut result = Vec::with_capacity(SALT_LEN + NONCE_LEN + ciphertext.len());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);

    Some(hex::encode(result))
}

#[wasm_bindgen(js_name = "k1_decrypt")]
pub fn decrypt_k1(k1e: String, password: String) -> Option<Vec<u8>> {
    let k1e = hex::decode(k1e).dbg_ok()?;

    if k1e.len() < SALT_LEN + NONCE_LEN {
        return None;
    }

    let salt = k1e[..SALT_LEN].try_into().dbg_ok()?;
    let nonce = XNonce::from_slice(&k1e[SALT_LEN..SALT_LEN + NONCE_LEN]);
    let ciphertext = &k1e[SALT_LEN + NONCE_LEN..];

    let kek = argon2(&password, &salt).dbg_ok()?;
    let cipher = XChaCha20Poly1305::new_from_slice(&kek).dbg_ok()?;
    let plaintext = cipher.decrypt(nonce, ciphertext).dbg_ok()?;

    Some(plaintext)
}

fn encrypt_sync(ptxt: &str, k1: &[u8]) -> Option<String> {
    let cipher = XChaCha20Poly1305::new_from_slice(k1).dbg_ok()?;
    let nonce = XNonce::from(random::bytes::<NONCE_LEN>());
    let ciphertext = cipher.encrypt(&nonce, ptxt.as_bytes()).dbg_ok()?;

    let mut result = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);

    Some(hex::encode(result))
}

#[wasm_bindgen(js_name = "encrypt")]
pub fn encrypt(ptxts: Box<[String]>, k1: &[u8]) -> Option<Box<[String]>> {
    ptxts
        .into_par_iter()
        .map(|ptxt| encrypt_sync(&ptxt, k1))
        .collect()
}

fn decrypt_sync(ctxt: &str, k1: &[u8]) -> Option<String> {
    let data = hex::decode(ctxt).dbg_ok()?;

    if data.len() < NONCE_LEN {
        return None;
    }

    let nonce = XNonce::from_slice(&data[..NONCE_LEN]);
    let ciphertext = &data[NONCE_LEN..];
    let cipher = XChaCha20Poly1305::new_from_slice(k1).dbg_ok()?;

    let plaintext = cipher.decrypt(nonce, ciphertext).dbg_ok()?;

    Some(String::from_utf8(plaintext).dbg_ok()?)
}

#[wasm_bindgen(js_name = "decrypt")]
pub fn decrypt(ctxts: Box<[String]>, k1: &[u8]) -> Option<Box<[String]>> {
    ctxts
        .into_par_iter()
        .map(|ctxt| decrypt_sync(&ctxt, k1))
        .collect()
}
