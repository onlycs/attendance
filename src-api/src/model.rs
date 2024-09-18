use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Deserialize)]
pub struct AttendRequest {
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

#[derive(Deserialize)]
pub struct ExistsRequest {
    pub id: i32,
}

#[derive(Serialize)]
pub struct ExistsResponse {
    pub exists: bool,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub id: i32,
    pub name: String,
}

#[derive(Serialize)]
pub struct RegisterResponse {
    pub success: bool,
}

#[derive(Deserialize)]
pub struct HoursRequest {
    pub id: i32,
    pub name: String,
}

#[derive(Serialize)]
pub struct HoursResponse {
    pub hours: f64,
}

pub struct AppState {
    pub pg: PgPool,
}
