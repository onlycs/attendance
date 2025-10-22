use std::{collections::HashMap, sync::Arc};

use actix_web::rt;
use sqlx::PgPool;
use tokio::sync::{RwLock, mpsc};
use tracing::{debug, error, info, instrument, warn};

use super::session::Session;
use crate::ws::{message::ServerMessage, pool::SubPool};

#[instrument(name = "student_data_pool_init", skip(pg))]
pub fn pool(pg: Arc<PgPool>) -> Arc<SubPool> {
    let (add_tx, mut add_rx) = mpsc::unbounded_channel::<Session>();
    let (remove_tx, mut remove_rx) = mpsc::unbounded_channel();
    let (update_tx, mut update_rx) = mpsc::unbounded_channel::<(String, u64)>();
    let subscriptions = Arc::new(RwLock::new(HashMap::new()));

    let descriptor = SubPool {
        update: update_tx.clone(),
        add: add_tx.clone(),
        remove: remove_tx.clone(),
        sessions: Arc::clone(&subscriptions),
    };

    rt::spawn(async move {
        let subscriptions_add = Arc::clone(&subscriptions);
        let subscriptions_remove = Arc::clone(&subscriptions);
        let subscriptions_update = Arc::clone(&subscriptions);
        let pool_add = pg;
        let pool_update = Arc::clone(&pool_add);

        rt::spawn(async move {
            info!("Student data add thread started");

            loop {
                let Some(mut session) = add_rx.recv().await else {
                    continue;
                };

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

                if let Err(_) = session.send(ServerMessage::StudentData(data)).await {
                    warn!(
                        session_id = %format!("{:#x}", session.id),
                        "Failed to send initial student data to session"
                    );
                } else {
                    debug!(
                        session_id = %format!("{:#x}", session.id),
                        "Sent initial student data to session"
                    );
                }

                subscriptions_add
                    .write()
                    .await
                    .entry(session.id)
                    .insert_entry(session);
            }
        });

        rt::spawn(async move {
            info!("Student data remove thread started");

            while let Some(to_remove) = remove_rx.recv().await {
                debug!(session_id = %format!("{:#x}", to_remove), "Removing session");
                subscriptions_remove.write().await.remove(&to_remove);
            }
        });

        rt::spawn(async move {
            info!("Student data update thread started");

            loop {
                let Some((data, _)) = update_rx.recv().await else {
                    continue;
                };

                let data = serde_json::from_str::<String>(&data).unwrap_or_default();

                if let Err(err) = sqlx::query!(
                    r#"
                    UPDATE cryptstore
                    SET student_data = $1
                    "#,
                    data
                )
                .execute(&*pool_update)
                .await
                {
                    error!(error = %err, "Failed to update student data in database");
                }

                let mut subs = subscriptions_update.write().await;
                let sub_count = subs.len();

                debug!(
                    subscriber_count = sub_count,
                    "Broadcasting student data update"
                );

                for session in subs.values_mut() {
                    if let Err(_) = session.send(ServerMessage::StudentData(data.clone())).await {
                        warn!(
                            session_id = %format!("{:#x}", session.id),
                            "Failed to send student data update to session"
                        );
                    }
                }
            }
        });
    });

    Arc::new(descriptor)
}
