use std::{
    collections::HashMap,
    sync::{Arc, LazyLock},
};

use sqlx::PgPool;
use tokio::sync::{RwLock, mpsc::UnboundedSender};

use super::{session::Session, subscription::Subscription};
use crate::ws::{WsError, editor, student_data};

pub struct SubPool {
    pub update: UnboundedSender<(String, u64)>,
    pub add: UnboundedSender<Session>,
    pub remove: UnboundedSender<u64>,
    pub sessions: Arc<RwLock<HashMap<u64, Session>>>,
}

pub struct SubPools {
    pools: RwLock<HashMap<Subscription, Arc<SubPool>>>,
}

impl SubPools {
    fn new() -> Self {
        Self {
            pools: RwLock::new(HashMap::new()),
        }
    }

    pub fn instance() -> Arc<Self> {
        static INSTANCE: LazyLock<Arc<SubPools>> = LazyLock::new(|| Arc::new(SubPools::new()));

        Arc::clone(&*INSTANCE)
    }

    pub async fn get(&self, sub: Subscription, pg: &Arc<PgPool>) -> Arc<SubPool> {
        Arc::clone(
            self.pools
                .write()
                .await
                .entry(sub)
                .or_insert_with(|| match sub {
                    Subscription::StudentData => student_data::pool(Arc::clone(pg)),
                    Subscription::Editor => editor::pool(Arc::clone(pg)),
                }),
        )
    }

    pub async fn remove_all(&self, id: u64) -> Result<(), WsError> {
        for pool in self.pools.read().await.values() {
            pool.remove.send(id).map_err(|_| WsError::Send)?;
        }

        Ok(())
    }
}
