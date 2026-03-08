use argon2::{Argon2, Params};
use chacha20poly1305::{KeyInit, XChaCha20Poly1305, XNonce, aead::Aead};
use rayon::iter::{IntoParallelIterator, ParallelIterator};
use snafu::Whatever;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{ResultExt, WhateverExt, random};

// argon2id parameters
const M_COST: u32 = 128 * 1024;
const T_COST: u32 = 3;
const P_CONST: u32 = 4;

// other parameters
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 24;

fn argon2(password: impl AsRef<[u8]>, salt: &[u8; SALT_LEN]) -> Result<[u8; 32], Whatever> {
    let params = Params::new(M_COST, T_COST, P_CONST, None).ctx("param create failed")?;
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
    let mut kek = [0u8; 32];

    argon2
        .hash_password_into(password.as_ref(), salt, &mut kek)
        .ctx("password hash failed")?;

    Ok(kek)
}

#[wasm_bindgen(js_name = "k1_encrypt")]
pub fn k1_encrypt(k1: &[u8], password: String) -> Option<String> {
    let salt = random::bytes::<SALT_LEN>().trace_ok()?;
    let nonce = XNonce::from(random::bytes::<NONCE_LEN>().trace_ok()?);

    let kek = argon2(&password, &salt).trace_ok()?;
    let cipher = XChaCha20Poly1305::new_from_slice(&kek).log_ok()?;
    let ciphertext = cipher.encrypt(&nonce, k1).log_ok()?;

    let mut result = Vec::with_capacity(SALT_LEN + NONCE_LEN + ciphertext.len());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);

    Some(hex::encode(result))
}

#[wasm_bindgen(js_name = "k1_key_encrypt")]
pub fn k1_encrypt_key(k1: &[u8], k2: &[u8]) -> Option<String> {
    let cipher = XChaCha20Poly1305::new_from_slice(k2).log_ok()?;
    let nonce = XNonce::from(random::bytes::<NONCE_LEN>().trace_ok()?);
    let ciphertext = cipher.encrypt(&nonce, k1).log_ok()?;

    let mut result = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);

    Some(hex::encode(result))
}

#[wasm_bindgen(js_name = "k1_decrypt")]
pub fn k1_decrypt(k1e: String, password: String) -> Option<Vec<u8>> {
    let k1e = hex::decode(k1e).ctx("Failed to decode hex").trace_ok()?;

    if k1e.len() < SALT_LEN + NONCE_LEN {
        return None;
    }

    let salt = k1e[..SALT_LEN].try_into().log_ok()?;

    let nonce = XNonce::from_slice(&k1e[SALT_LEN..SALT_LEN + NONCE_LEN]);
    let ciphertext = &k1e[SALT_LEN + NONCE_LEN..];

    let kek = argon2(&password, &salt).trace_ok()?;
    let cipher = XChaCha20Poly1305::new_from_slice(&kek)
        .ctx("Failed to create cipher")
        .trace_ok()?;

    let plaintext = cipher.decrypt(nonce, ciphertext).log_ok()?;

    Some(plaintext)
}

#[wasm_bindgen(js_name = "k1_key_decrypt")]
pub fn k1_decrypt_key(k1e: String, k2: &[u8]) -> Option<Vec<u8>> {
    let data = hex::decode(k1e).log_ok()?;

    if data.len() < NONCE_LEN {
        return None;
    }

    let nonce = XNonce::from_slice(&data[..NONCE_LEN]);
    let ciphertext = &data[NONCE_LEN..];
    let cipher = XChaCha20Poly1305::new_from_slice(k2).log_ok()?;
    let k1 = cipher.decrypt(nonce, ciphertext).log_ok()?;

    Some(k1)
}

fn encrypt_sync(ptxt: &str, k1: &[u8]) -> Option<String> {
    let cipher = XChaCha20Poly1305::new_from_slice(k1).log_ok()?;
    let nonce = XNonce::from(random::bytes::<NONCE_LEN>().trace_ok()?);
    let ciphertext = cipher.encrypt(&nonce, ptxt.as_bytes()).log_ok()?;

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
    let data = hex::decode(ctxt).log_ok()?;

    if data.len() < NONCE_LEN {
        return None;
    }

    let nonce = XNonce::from_slice(&data[..NONCE_LEN]);
    let ciphertext = &data[NONCE_LEN..];
    let cipher = XChaCha20Poly1305::new_from_slice(k1).log_ok()?;
    let plaintext = cipher.decrypt(nonce, ciphertext).log_ok()?;

    Some(String::from_utf8(plaintext).log_ok()?)
}

#[wasm_bindgen(js_name = "decrypt")]
pub fn decrypt(ctxts: Box<[String]>, k1: &[u8]) -> Option<Box<[String]>> {
    ctxts
        .into_par_iter()
        .map(|ctxt| decrypt_sync(&ctxt, k1))
        .collect()
}
