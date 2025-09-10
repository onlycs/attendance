use core::fmt;

use serde::{Deserialize, Serialize};

use super::{subscription::Subscription, WsError};
use crate::ws::editor::ReplicateQuery;

#[derive(Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum ClientMessage {
    Subscribe {
        token: String,
        sub: Subscription,
    },
    Update {
        sub: Subscription,
        value: serde_json::Value,
    },
}

impl fmt::Debug for ClientMessage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ClientMessage::Subscribe { sub, .. } => write!(f, "Subscribe({sub:?})"),
            ClientMessage::Update { sub, .. } => write!(f, "Update({sub:?})"),
        }
    }
}

#[derive(Serialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerMessage<'a> {
    StudentData(String),
    EditorData(&'a ReplicateQuery<'a>),
    Error { message: String, meta: WsError },
}
