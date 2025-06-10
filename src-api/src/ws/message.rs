use serde::{Deserialize, Serialize};

use super::{subscription::Subscription, WsError};

#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum ClientMessage {
    Subscribe(Subscription),
    Update { sub: Subscription, value: String },
}

#[derive(Serialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerMessage {
    StudentData(String),
    Error { message: String, meta: WsError },
}
