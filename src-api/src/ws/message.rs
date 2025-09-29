use core::fmt;

use serde::{Deserialize, Serialize};

use super::subscription::Subscription;
use crate::ws::{WsError, editor::ReplicateQuery};

#[derive(Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum ClientMessage {
    Authenticate {
        token: String,
    },
    Subscribe {
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
            ClientMessage::Authenticate { .. } => write!(f, "Authenticate(...)"),
            ClientMessage::Subscribe { sub, .. } => write!(f, "Subscribe({sub:?})"),
            ClientMessage::Update { sub, .. } => write!(f, "Update({sub:?})"),
        }
    }
}

#[derive(Serialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerMessage<'a> {
    AuthenticateOk,
    StudentData(String),
    EditorData(&'a ReplicateQuery<'a>),
    Error { message: String, meta: WsError },
}
