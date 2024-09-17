use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Deserialize)]
pub struct AttendRequest {
    pub auth: String,
    pub id: i32,
}

#[derive(Deserialize)]
pub struct AuthRequest {
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
}

pub struct AppState {
    pub pg: PgPool,
}
