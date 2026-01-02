pub(crate) mod tables;
pub(crate) mod types;

use std::{
    any::{Any, TypeId},
    collections::HashMap,
    sync::{Arc, LazyLock},
};

use sqlx::postgres::PgListener;
use tokio::sync::{
    Mutex,
    broadcast::{self, Receiver},
};
use tokio_stream::wrappers::BroadcastStream;

use crate::prelude::*;

pub(crate) async fn stream<R: Row + for<'de> Deserialize<'de>>() -> BroadcastStream<Replication<R>>
{
    async fn create<R: Row>() -> Receiver<Replication<R>> {
        let (tx, rx) = broadcast::channel(1024);

        tokio::spawn(async move {
            let mut listener = PgListener::connect(&*env::DATABASE_URL).await?;
            listener.listen(&format!("replicate:{}", R::NAME)).await?;

            while let Ok(notif) = listener.recv().await {
                let pl = notif.payload();
                let repl = match serde_json::from_str::<Replication<R>>(pl) {
                    Ok(r) => r,
                    Err(err) => {
                        warn!(
                            task = %format!("ws::sql::{}", R::NAME),
                            error = %err,
                            "failed to parse replication payload"
                        );
                        continue;
                    }
                };

                tx.send(repl).unwrap_or(0);
            }

            Ok::<(), sqlx::Error>(())
        });

        rx
    }

    static CACHE: LazyLock<Mutex<HashMap<TypeId, Arc<dyn Any + Send + Sync>>>> =
        LazyLock::new(|| Mutex::new(HashMap::new()));

    let typ = TypeId::of::<R>();
    let mut lock = CACHE.lock().await;

    if let Some(rx) = lock.get(&typ) {
        let rx = rx.clone().downcast::<Receiver<Replication<R>>>().unwrap();
        return BroadcastStream::new(rx.resubscribe());
    }

    let rx = Arc::new(create().await);

    lock.insert(typ, rx.clone());
    BroadcastStream::new(rx.resubscribe())
}

pub(crate) use tables::*;
pub(crate) use types::*;
