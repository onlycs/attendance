use core::fmt;

use serde::{Deserialize, Serialize};

use super::{subscription::Subscription, WsError};

#[derive(Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum ClientMessage {
    Subscribe(Subscription),
    Update { sub: Subscription, value: String },
}

impl fmt::Debug for ClientMessage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ClientMessage::Subscribe(sub) => write!(f, "Subscribe({sub:?})"),
            ClientMessage::Update { sub, .. } => write!(f, "Update({sub:?})"),
        }
    }
}

#[derive(Serialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerMessage {
    StudentData(String),
    Error { message: String, meta: WsError },
}
