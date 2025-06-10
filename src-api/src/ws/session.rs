use std::{
    collections::HashSet,
    ops::{Deref, DerefMut},
    process,
    sync::LazyLock,
};

use actix_web::rt;
use actix_ws::Session as SessionPrim;
use rand::Rng;
use tokio::sync::RwLock;

use super::{message::ServerMessage, WsError};

static IDS: LazyLock<RwLock<HashSet<u64>>> = LazyLock::new(|| RwLock::new(HashSet::new()));

#[derive(Clone)]
pub struct Session {
    pub id: u64,
    session: SessionPrim,
}

impl Session {
    pub async fn new(session: SessionPrim) -> Self {
        let mut ids = IDS.write().await;

        // if this happens, what the actual fuck
        if ids.len() as u64 == u64::MAX {
            error!("Ran out of session ids... how the fuck is the server still on");
            process::exit(1);
        }

        let mut rng = rand::rng();
        let mut id = rng.random();
        while !ids.insert(id) {
            id = rng.random();
        }

        Self { id, session }
    }

    pub async fn send(&mut self, data: ServerMessage) -> Result<(), WsError> {
        let serialized = serde_json::to_string(&data)?;
        self.session.text(serialized).await?;
        Ok(())
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        let id = self.id;
        rt::spawn(async move { IDS.write().await.remove(&id) });
    }
}

impl Deref for Session {
    type Target = SessionPrim;

    fn deref(&self) -> &Self::Target {
        &self.session
    }
}

impl DerefMut for Session {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.session
    }
}
