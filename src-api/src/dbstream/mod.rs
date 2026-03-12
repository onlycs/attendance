pub(crate) mod tables;
pub(crate) mod types;

use futures_util::Stream;
use sqlx::postgres::PgListener;

use crate::prelude::*;

pub(crate) async fn stream<R: Row + for<'de> Deserialize<'de>>()
-> Result<impl Stream<Item = Replication<R>>, sqlx::Error> {
    let mut pg = PgListener::connect(&*env::DATABASE_URL).await?;
    pg.listen(&format!("replicate:{}", R::NAME)).await?;

    info!(
        task = %format!("ws::sql::{}", R::NAME),
        "started replication listener"
    );

    Ok(pg.into_stream().filter_map(|notif| async move {
        let pl = match notif {
            Ok(n) => n.payload().to_string(),
            Err(err) => {
                warn!(
                    task = %format!("ws::sql::{}", R::NAME),
                    error = %err,
                    "Failed to receive notification"
                );
                return None;
            }
        };

        debug!(
            task = %format!("ws::sql::{}", R::NAME),
            payload = %pl,
            "received replication notification"
        );

        let repl = match serde_json::from_str::<Replication<R>>(&pl) {
            Ok(r) => r,
            Err(err) => {
                warn!(
                    task = %format!("ws::sql::{}", R::NAME),
                    error = %err,
                    "failed to parse replication payload"
                );
                return None;
            }
        };

        info!(
            task = %format!("ws::sql::{}", R::NAME),
            replication = ?repl,
            "recieved replication"
        );

        Some(repl)
    }))
}

pub(crate) use tables::*;
pub(crate) use types::*;
