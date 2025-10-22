use std::{collections::HashMap, sync::Arc};

use actix_web::rt;
use chrono::{DateTime, Local, NaiveDate, NaiveDateTime};
use sqlx::{PgExecutor, PgPool, QueryBuilder, postgres::PgListener};
use tokio::sync::{RwLock, mpsc};
use tracing::{debug, error, info, instrument, warn};

use crate::{
    http::roster::HourType,
    prelude::*,
    ws::{WsError, message::ServerMessage, pool::SubPool, session::Session},
};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "UPPERCASE")]
enum Operation {
    Insert,
    Update,
    Delete,
}

#[derive(Deserialize, Debug)]
struct PgWatchUpdate {
    operation: Operation,
    id: String,
    student_id: String,
    sign_in: NaiveDateTime,
    sign_out: Option<NaiveDateTime>,
    kind: HourType,
}

#[derive(Clone, Debug, Serialize)]
pub struct TimeEntry {
    pub id: String,
    pub kind: HourType,
    #[serde(with = "chrono_temporal")]
    pub start: DateTime<Local>,
    #[serde(with = "chrono_temporal::optional")]
    pub end: Option<DateTime<Local>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
#[serde(rename_all = "lowercase")]
pub enum TimeEntryUpdate {
    Kind(HourType),
    #[serde(with = "chrono_temporal")]
    Start(DateTime<Local>),
    #[serde(with = "chrono_temporal::optional")]
    End(Option<DateTime<Local>>),
}

#[derive(Clone, Debug, Serialize)]
pub struct Cell {
    pub date: NaiveDate,
    pub entries: HashMap<String, TimeEntry>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Row {
    pub id: String,
    pub cells: Vec<Cell>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "type")]
#[serde(rename_all_fields = "camelCase")]
pub enum UpdateQuery {
    Create {
        student_id: String,
        #[serde(with = "chrono_temporal")]
        sign_in: DateTime<Local>,
        #[serde(with = "chrono_temporal::optional")]
        sign_out: Option<DateTime<Local>>,
        hour_type: HourType,
    },

    Update {
        id: String,
        updates: Vec<TimeEntryUpdate>,
    },

    Delete {
        id: String,
    },

    Batch(Vec<UpdateQuery>),
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type")]
#[serde(rename_all_fields = "camelCase")]
pub enum ReplicateQuery<'a> {
    Full {
        data: &'a HashMap<String, Row>,
    },

    Create {
        student_id: String,
        date: NaiveDate,
        entry: TimeEntry,
    },

    Update {
        student_id: String,
        date: NaiveDate,
        id: String,
        updates: Vec<TimeEntryUpdate>,
    },

    Delete {
        student_id: String,
        date: NaiveDate,
        id: String,
    },
}

#[instrument(name = "editor_init", skip(pg))]
async fn init(pg: &PgPool) -> Result<(Vec<NaiveDate>, HashMap<String, Row>), sqlx::Error> {
    let initial =
        sqlx::query!(
            r#"
            SELECT id, student_id, sign_in, sign_out, hour_type as "hour_type: HourType" FROM records
            ORDER BY sign_in DESC
            "#
        )
            .fetch_all(pg)
            .await?;

    info!(
        record_count = initial.len(),
        "Editor initialization completed"
    );

    let mut added_dates = Vec::new();
    let mut rows = HashMap::<String, Row>::new();

    for record in initial {
        let student_id = &record.student_id;
        let time_in = record.sign_in;
        let time_out = record.sign_out;

        let time_in = time_in.and_utc().with_timezone(&Local);
        let time_out = time_out.map(|t| t.and_utc().with_timezone(&Local));
        let day = time_in.date_naive();

        // if we haven't seen this day before, we need to add it to every row
        // days are sorted decending, so if we have seen it, it must be the last one
        if added_dates.last().is_none_or(|&d| d != day) {
            added_dates.push(day);

            for row in rows.values_mut() {
                row.cells.push(Cell {
                    date: day,
                    entries: HashMap::new(),
                });
            }
        }

        let entry = TimeEntry {
            id: record.id,
            start: time_in,
            end: time_out,
            kind: record.hour_type,
        };

        rows.entry(student_id.clone())
            .or_insert_with(|| Row {
                id: student_id.clone(),
                cells: added_dates
                    .iter()
                    .map(|&d| Cell {
                        date: d,
                        entries: HashMap::new(),
                    })
                    .collect(),
            })
            .cells
            .last_mut()
            .unwrap()
            .entries
            .insert(entry.id.clone(), entry);
    }

    Ok((added_dates, rows))
}

async fn add_thread(
    subs: Arc<RwLock<HashMap<u64, Session>>>,
    mut rx: mpsc::UnboundedReceiver<Session>,
    data: Arc<RwLock<HashMap<String, Row>>>,
) -> Result<!, sqlx::Error> {
    info!("Editor add thread started");

    while let Some(mut session) = rx.recv().await {
        let session_id = session.id;
        let data = data.read().await;
        let rq = ReplicateQuery::Full { data: &data };

        if let Err(_) = session.send(ServerMessage::EditorData(&rq)).await {
            warn!(session_id = %format!("{:#x}", session_id), "Failed to send initial data to session");
        } else {
            debug!(session_id = %format!("{:#x}", session_id), "Sent initial data to session");
        }

        subs.write().await.insert(session.id, session);
    }

    panic!("Editor add thread terminated unexpectedly");
}

#[allow(clippy::too_many_lines)]
async fn watch_thread(
    mut dates: Vec<NaiveDate>,
    subs: Arc<RwLock<HashMap<u64, Session>>>,
    data: Arc<RwLock<HashMap<String, Row>>>,
) -> Result<!, WsServerError> {
    let mut watcher = PgListener::connect(&env::var("DATABASE_URL")?).await?;
    watcher.listen("record_update").await?;

    info!("Editor watch thread started, listening for roster updates");

    while let Ok(notification) = watcher.recv().await {
        let payload = notification.payload();

        // parse the payload as a JSON string
        let change: PgWatchUpdate = match serde_json::from_str(payload) {
            Ok(change) => change,
            Err(_) => {
                warn!("Failed to parse database notification payload");
                continue;
            }
        };

        debug!(
            change = ?change,
            "Database notification received for roster update"
        );

        let sign_in = change.sign_in.and_utc().with_timezone(&Local);
        let sign_out = change.sign_out.map(|t| t.and_utc().with_timezone(&Local));

        let rq: ReplicateQuery;

        match change.operation {
            Operation::Delete => {
                let mut rows = data.write().await;
                let Some(row) = rows.get_mut(&change.student_id) else {
                    warn!(student_id_prefix = %&change.student_id[..7], "Delete for unknown student");
                    continue;
                };

                let day = sign_in.date_naive();

                let Some(Cell { entries, .. }) = row.cells.iter_mut().find(|cell| cell.date == day)
                else {
                    warn!(
                        student_id_prefix = %&change.student_id[..7],
                        date = %day,
                        "Delete for unknown date"
                    );
                    continue;
                };

                entries.remove(&change.id);

                rq = ReplicateQuery::Delete {
                    student_id: change.student_id,
                    date: day,
                    id: change.id,
                };
            }
            Operation::Insert => {
                let day = sign_in.date_naive();
                let mut rows = data.write().await;

                if !rows.contains_key(&change.student_id) {
                    let mut row = Row {
                        id: change.student_id.clone(),
                        cells: vec![],
                    };

                    for date in &dates {
                        row.cells.push(Cell {
                            date: *date,
                            entries: HashMap::new(),
                        });
                    }

                    rows.insert(change.student_id.clone(), row);
                }

                if !dates.contains(&day) {
                    let pos = dates.iter().position(|&d| d < day).unwrap_or(dates.len());
                    dates.insert(pos, day);

                    // if we haven't seen this day before, we need to add it to every row
                    for row in rows.values_mut() {
                        let pos = row
                            .cells
                            .iter()
                            .position(|cell| cell.date < day)
                            .unwrap_or(row.cells.len());

                        row.cells.insert(
                            pos,
                            Cell {
                                date: day,
                                entries: HashMap::new(),
                            },
                        );
                    }
                }

                let Some(row) = rows.get_mut(&change.student_id) else {
                    warn!(student_id_prefix = %&change.student_id[..7], "Insert for unknown student");
                    continue;
                };

                let Some(Cell { entries, .. }) = row.cells.iter_mut().find(|cell| cell.date == day)
                else {
                    warn!(
                        student_id_prefix = %&change.student_id[..7],
                        date = %day,
                        "Insert for unknown date"
                    );
                    continue;
                };

                let entry = TimeEntry {
                    id: change.id,
                    start: sign_in,
                    end: sign_out,
                    kind: change.kind,
                };

                entries.insert(entry.id.clone(), entry.clone());

                rq = ReplicateQuery::Create {
                    student_id: change.student_id,
                    date: day,
                    entry,
                };
            }
            Operation::Update => {
                let mut rows = data.write().await;
                let Some(row) = rows.get_mut(&change.student_id) else {
                    warn!(student_id_prefix = %&change.student_id[..7], "Update for unknown student");
                    continue;
                };

                let day = change.sign_in.and_utc().with_timezone(&Local).date_naive();

                let Some(Cell { entries, .. }) = row.cells.iter_mut().find(|cell| cell.date == day)
                else {
                    warn!(
                        student_id_prefix = %&change.student_id[..7],
                        date = %day,
                        "Update for unknown date"
                    );
                    continue;
                };

                // find the entry to update
                // there is no reason for the entry's id to change, future devs beware
                let mut updates = vec![];

                if let Some(entry) = entries.get_mut(&change.id) {
                    updates.push(TimeEntryUpdate::Start(sign_in));
                    entry.start = sign_in;

                    updates.push(TimeEntryUpdate::End(sign_out));
                    entry.end = sign_out;

                    updates.push(TimeEntryUpdate::Kind(change.kind));
                    entry.kind = change.kind;
                } else {
                    warn!(
                        student_id_prefix = %&change.student_id[..7],
                        date = %day,
                        id_prefix = %&change.id[..7],
                        "Update for unknown entry"
                    );
                }

                rq = ReplicateQuery::Update {
                    student_id: change.student_id,
                    date: day,
                    id: change.id,
                    updates,
                };
            }
        }

        let mut subs = subs.write().await;
        let sub_count = subs.len();

        debug!(
            subscriber_count = sub_count,
            "Broadcasting update to subscribers"
        );

        // send the update to all subscribers
        let futures = subs
            .values_mut()
            .map(|session| session.send(ServerMessage::EditorData(&rq)));

        futures_util::future::join_all(futures)
            .await
            .into_iter()
            .filter_map(Result::err)
            .for_each(|err| error!(error = %err, "Failed to send update message"));
    }

    panic!("Watch thread terminated unexpectedly");
}

#[instrument(
    name = "editor_process_update",
    skip(pg, pool, query),
    fields(
        query_type = tracing::field::Empty,
        student_id = tracing::field::Empty,
        entry_id = tracing::field::Empty,
        hour_type = tracing::field::Empty,
        update_count = tracing::field::Empty,
    )
)]
async fn process_update(
    pg: impl PgExecutor<'_>,
    pool: &PgPool,
    query: UpdateQuery,
) -> Result<(), WsServerError> {
    match query {
        UpdateQuery::Create {
            student_id,
            sign_in,
            sign_out,
            hour_type,
        } => {
            tracing::Span::current().record("query_type", "create");
            tracing::Span::current().record("student_id", &student_id[..7]);
            tracing::Span::current().record("hour_type", format!("{:?}", hour_type).as_str());

            sqlx::query!(
                r#"
                INSERT INTO records (id, student_id, in_progress, sign_in, sign_out, hour_type)
                VALUES ($1, $2, $3, $4, $5, $6);
                "#,
                cuid2(),
                student_id,
                sign_out.is_none(),
                sign_in.naive_utc(),
                sign_out.map(|t| t.naive_utc()),
                hour_type as HourType
            )
            .execute(pg)
            .await?;
        }
        UpdateQuery::Update {
            id: entry_id,
            updates,
        } => {
            tracing::Span::current().record("query_type", "update");
            tracing::Span::current().record("entry_id", &entry_id[..7]);
            tracing::Span::current().record("update_count", updates.len());

            let mut query = QueryBuilder::new("UPDATE records SET ");

            for (i, update) in updates.iter().enumerate() {
                if i != 0 {
                    query.push(", ");
                }

                match update {
                    TimeEntryUpdate::Kind(kind) => {
                        query.push("hour_type = ");
                        query.push_bind(*kind as HourType);
                    }
                    TimeEntryUpdate::Start(start) => {
                        query.push("sign_in = ");
                        query.push_bind(start.naive_utc());
                    }
                    TimeEntryUpdate::End(end) => {
                        if let Some(end) = end {
                            query.push("in_progress = false, sign_out = ");
                            query.push_bind(end.naive_utc());
                        } else {
                            query.push("in_progress = true, sign_out = ");
                            query.push("NULL");
                        }
                    }
                }
            }

            query.push(" WHERE id = ");
            query.push_bind(entry_id);

            query.build().execute(pg).await?;
        }
        UpdateQuery::Delete { id } => {
            tracing::Span::current().record("query_type", "delete");
            tracing::Span::current().record("entry_id", &id[..7]);

            sqlx::query!(
                r#"
                    DELETE FROM records
                    WHERE id = $1
                    "#,
                id
            )
            .execute(pg)
            .await?;
        }
        UpdateQuery::Batch(mut queries) => {
            tracing::Span::current().record("query_type", "batch");

            queries = queries
                .into_iter()
                .flat_map(|q| match q {
                    UpdateQuery::Batch(nested) => nested,
                    other => vec![other],
                })
                .collect();

            debug!(batch_size = queries.len(), "Processing batch");

            let mut tx = pool.begin().await.unwrap();

            for query in queries {
                Box::pin(process_update(&mut *tx, pool, query)).await?;
            }

            tx.commit().await?;
        }
    }

    Ok(())
}

async fn update_thread(
    pg: Arc<PgPool>,
    subscriptions: Arc<RwLock<HashMap<u64, Session>>>,
    mut rx: mpsc::UnboundedReceiver<(String, u64)>,
) -> ! {
    info!("Editor update thread started");

    while let Some((message, session_id)) = rx.recv().await {
        let query: UpdateQuery = match serde_json::from_str(&message) {
            Ok(data) => data,
            Err(err) => {
                error!(error = %err, session_id = %format!("{:#x}", session_id), "Failed to deserialize message");
                continue;
            }
        };

        let result = process_update(&*pg, &pg, query).await.err();
        let hr_error: WsError;

        let Some(err) = result else {
            continue;
        };

        match &err {
            WsServerError::Db {
                source: sqlx::Error::Database(db_err),
                ..
            } => {
                let message = db_err.message();

                if message.contains("time_check") {
                    hr_error = WsError::Time;
                } else if message.contains("violates check constraint") {
                    hr_error = WsError::Data;
                } else {
                    hr_error = WsError::Unknown;
                }
            }
            _ => {
                hr_error = WsError::Unknown;
            }
        }

        error!(error = %err, session_id = %format!("{:#x}", session_id), "Failed to process update");
        warn!(session_id = %format!("{:#x}", session_id), error_type = ?hr_error, "Sent error response to session");

        let mut subs = subscriptions.write().await;
        let Some(session) = subs.get_mut(&session_id) else {
            warn!(session_id = %format!("{:#x}", session_id), "Could not find session to send error response");
            continue;
        };

        if let Err(err) = session
            .send(ServerMessage::Error {
                message: format!("{hr_error}"),
                meta: hr_error,
            })
            .await
        {
            error!(error = %err, session_id = %format!("{:#x}", session_id), "Failed to send error message");
        }
    }

    panic!("Update thread terminated unexpectedly");
}

async fn remove_thread(
    subs: Arc<RwLock<HashMap<u64, Session>>>,
    mut rx: mpsc::UnboundedReceiver<u64>,
) -> ! {
    info!("Editor remove thread started");

    while let Some(id) = rx.recv().await {
        debug!(session_id = %format!("{:#x}", id), "Removing session");
        subs.write().await.remove(&id);
    }

    panic!("Editor remove thread terminated unexpectedly");
}

#[instrument(name = "editor_pool_init", skip(pg))]
pub fn pool(pg: Arc<PgPool>) -> Arc<SubPool> {
    let (add_tx, add_rx) = mpsc::unbounded_channel::<Session>();
    let (remove_tx, remove_rx) = mpsc::unbounded_channel();
    let (update_tx, update_rx) = mpsc::unbounded_channel::<(String, u64)>();
    let subscriptions = Arc::new(RwLock::new(HashMap::new()));

    let descriptor = SubPool {
        update: update_tx.clone(),
        add: add_tx.clone(),
        remove: remove_tx.clone(),
        sessions: Arc::clone(&subscriptions),
    };

    rt::spawn(async move {
        let pool_update = Arc::clone(&pg);

        let (dates, data) = init(&pg).await.unwrap_or_else(|err| {
            error!(error = %err, "Failed to initialize editor roster data");
            (Vec::new(), HashMap::new())
        });

        let data = Arc::new(RwLock::new(data));

        rt::spawn(add_thread(
            Arc::clone(&subscriptions),
            add_rx,
            Arc::clone(&data),
        ));

        rt::spawn(watch_thread(
            dates,
            Arc::clone(&subscriptions),
            Arc::clone(&data),
        ));

        rt::spawn(update_thread(
            pool_update,
            Arc::clone(&subscriptions),
            update_rx,
        ));

        rt::spawn(remove_thread(Arc::clone(&subscriptions), remove_rx));
    });

    Arc::new(descriptor)
}
