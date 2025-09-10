use std::{collections::HashMap, sync::Arc};

use actix_web::rt;
use sqlx::PgPool;
use tokio::sync::{mpsc, RwLock};

use super::session::Session;
use crate::ws::{message::ServerMessage, pool::SubPool};

pub fn pool(pg: Arc<PgPool>) -> Arc<SubPool> {
    let (add_tx, mut add_rx) = mpsc::unbounded_channel::<Session>();
    let (remove_tx, mut remove_rx) = mpsc::unbounded_channel();
    let (update_tx, mut update_rx) = mpsc::unbounded_channel::<String>();

    let task = rt::spawn(async move {
        let subscriptions_add = Arc::new(RwLock::new(HashMap::new()));
        let subscriptions_remove = Arc::clone(&subscriptions_add);
        let subscriptions_update = Arc::clone(&subscriptions_add);

        let pool_add = pg;
        let pool_update = Arc::clone(&pool_add);

        rt::spawn(async move {
            loop {
                let Some(mut session) = add_rx.recv().await else {
                    continue;
                };

                // send an initial response with the current data
                let data = sqlx::query!(
                    r#"
                    SELECT student_data FROM cryptstore
                    WHERE id
                    "#
                )
                .fetch_optional(&*pool_add)
                .await
                .ok()
                .flatten()
                .map(|record| record.student_data)
                .unwrap_or_default();

                if let Err(err) = session.send(ServerMessage::StudentData(data)).await {
                    error!("[StudentData] Failed to send initial subscription response: {err}");
                }

                subscriptions_add
                    .write()
                    .await
                    .entry(session.id)
                    .insert_entry(session);
            }
        });

        rt::spawn(async move {
            while let Some(to_remove) = remove_rx.recv().await {
                subscriptions_remove.write().await.remove(&to_remove);
            }
        });

        rt::spawn(async move {
            loop {
                let Some(data) = update_rx.recv().await else {
                    continue;
                };

                let data = serde_json::from_str::<String>(&data).unwrap_or_default();

                if let Err(err) = sqlx::query!(
                    r#"
                    UPDATE cryptstore
                    SET student_data = $1
                    WHERE id
                    "#,
                    data
                )
                .execute(&*pool_update)
                .await
                {
                    error!("[StudentData] Failed to update data in database: {err}");
                }

                for session in subscriptions_update.write().await.values_mut() {
                    if let Err(err) = session.send(ServerMessage::StudentData(data.clone())).await {
                        error!("[StudentData] Failed to send update message: {err}");
                    }
                }
            }
        });
    });

    Arc::new(SubPool {
        update: update_tx,
        add: add_tx,
        remove: remove_tx,
        process: task,
    })
}
