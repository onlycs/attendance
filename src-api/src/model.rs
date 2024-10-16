use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Deserialize)]
pub struct AuthRequest {
    pub password: String,
}

#[derive(Deserialize)]
pub struct HoursRequest {
    pub id: String,
}

#[derive(Deserialize)]
pub struct RosterRequest {
    pub id: String,
}

#[derive(Deserialize)]
pub struct CSVRequest {
    #[serde(default)]
    pub json: bool,
}

#[derive(Serialize)]
pub struct HoursResponse {
    pub hours: f64,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
}

#[derive(Serialize)]
pub struct RosterResponse {
    pub login: bool,
}

#[derive(Serialize)]
pub struct CSVResponse {
    pub csv: String,
}

pub struct AppState {
    pub pg: PgPool,
}
