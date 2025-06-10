use std::{
    collections::HashMap,
    sync::{Arc, LazyLock},
};

use actix_web::rt::task::JoinHandle;
use sqlx::PgPool;
use tokio::sync::{mpsc::UnboundedSender, RwLock};

use super::{session::Session, subscription::Subscription};
use crate::ws::WsError;

#[derive(Debug)]
pub struct SubPool {
    #[allow(dead_code)]
    pub process: JoinHandle<()>,
    pub update: UnboundedSender<String>,
    pub add: UnboundedSender<Session>,
    pub remove: UnboundedSender<u64>,
}

#[derive(Debug)]
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

    pub async fn get<'a>(&'a self, sub: Subscription, pg: &Arc<PgPool>) -> Arc<SubPool> {
        Arc::clone(
            self.pools
                .write()
                .await
                .entry(sub)
                .or_insert_with(|| sub.pool(Arc::clone(&pg))),
        )
    }

    pub async fn remove_all(&self, id: u64) -> Result<(), WsError> {
        for pool in self.pools.read().await.values() {
            pool.remove.send(id).map_err(|_| WsError::Send)?;
        }

        Ok(())
    }
}
