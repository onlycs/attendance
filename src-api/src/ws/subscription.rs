use std::{collections::HashMap, sync::Arc};

use actix_web::rt;
use tokio::sync::{mpsc, RwLock};

use super::{message::ServerMessage, pool::SubPool, session::Session};
use crate::prelude::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum Subscription {
    StudentData,
}

impl Subscription {
    pub(super) fn pool(self, pg: Arc<PgPool>) -> Arc<SubPool> {
        let (add_tx, mut add_rx) = mpsc::unbounded_channel::<Session>();
        let (remove_tx, mut remove_rx) = mpsc::unbounded_channel();
        let (update_tx, mut update_rx) = mpsc::unbounded_channel::<String>();

        let get_data = async |pg: &PgPool| {
            let data = match self {
                Self::StudentData => sqlx::query!(
                    r#"
                    SELECT student_data FROM cryptstore
                    WHERE id
                    "#
                )
                .fetch_optional(pg)
                .await?
                .map(|record| record.student_data)
                .unwrap_or_default(),
            };

            Ok::<_, sqlx::Error>(data)
        };

        let put_data = async |pg: &PgPool, data: &str| match self {
            Self::StudentData => {
                sqlx::query!(
                    r#"
                    UPDATE cryptstore
                    SET student_data = $1
                    WHERE id
                    "#,
                    data
                )
                .execute(pg)
                .await
            }
        };

        let message = match self {
            Self::StudentData => ServerMessage::StudentData,
        };

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

                    let Ok(sub_data) = get_data(&pool_add).await else {
                        continue;
                    };

                    if let Err(err) = session.send(message(sub_data)).await {
                        error!("[SubPool {self:?}] Failed to send initial subscription response:\n{err}");
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

                    if let Err(err) = put_data(&pool_update, &data).await {
                        error!("[SubPool {self:?}] Failed to update data in database:\n{err}");
                    }

                    for session in subscriptions_update.write().await.values_mut() {
                        if let Err(err) = session.send(message(data.clone())).await {
                            error!("[SubPool {self:?}] Failed to send update message:\n{err}");
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
}
