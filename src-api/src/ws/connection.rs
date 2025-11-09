use std::{
    collections::HashMap,
    sync::{Arc, LazyLock},
};

use actix_web::rt;
use actix_ws::Session;
use rand::Rng;
use tokio::sync::Mutex;

use crate::ws::schema::OutgoingPayload;

static CONNECTIONS: LazyLock<Arc<Mutex<HashMap<u64, Session>>>> =
    LazyLock::new(|| Arc::new(Mutex::new(HashMap::new())));

fn generate_id(connections: &HashMap<u64, Session>) -> u64 {
    let mut rng = rand::rng();
    let mut id;

    while {
        id = rng.random();
        connections.contains_key(&id)
    } {}

    id
}

fn remove(id: u64) {
    rt::spawn(async move {
        let mut connections = CONNECTIONS.lock().await;
        connections.remove(&id);
    });
}

pub struct Connection {
    id: u64,
}

impl Connection {
    pub async fn new(session: Session) -> Self {
        let mut connections = CONNECTIONS.lock().await;
        let id = generate_id(&connections);
        connections.insert(id, session);
        Self { id }
    }

    pub async fn send<'a>(&mut self, payload: OutgoingPayload) {
        let message = serde_json::to_string(&payload).unwrap();
        let mut connections = CONNECTIONS.lock().await;
        let session = connections.get_mut(&self.id).unwrap();

        if let Err(_) = session.text(message).await {
            warn!("Tried to send a message to a closed Websocket")
        }
    }

    pub async fn send_all<'a>(payload: OutgoingPayload) {
        let message = serde_json::to_string(&payload).unwrap();
        let mut connections = CONNECTIONS.lock().await;
        let futures = connections
            .values_mut()
            .map(|conn| conn.text(message.as_str()));

        futures_util::future::join_all(futures).await;
    }

    pub fn id(&self) -> u64 {
        self.id
    }
}

impl Drop for Connection {
    fn drop(&mut self) {
        remove(self.id);
    }
}
