use std::{collections::HashMap, fmt::Write, sync::Arc};

use actix_web::rt;
use chrono::{DateTime, Local, NaiveDate, NaiveDateTime};
use sqlx::{PgExecutor, PgPool, postgres::PgListener};
use tokio::sync::{RwLock, mpsc};

use crate::{
    http::roster::HourType,
    prelude::*,
    ws::{WsError, message::ServerMessage, pool::SubPool, session::Session},
};

#[derive(Deserialize)]
#[serde(rename_all = "UPPERCASE")]
enum Operation {
    Insert,
    Update,
    Delete,
}

#[derive(Deserialize)]
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

    debug!(
        "Commencing editor initialization ({} records)",
        initial.len()
    );

    let mut added_dates = Vec::new();
    let mut rows = HashMap::<String, Row>::new();

    for record in initial {
        let student_id = &record.student_id;
        let time_in = record.sign_in;
        let time_out = record.sign_out;

        // times are stored as utc, we can convert them to non-naive datetime
        let time_in = time_in.and_utc();
        let time_out = time_out.map(|t| t.and_utc());

        // i want to give them back as local, i.e. America/New_York
        let time_in = time_in.with_timezone(&Local);
        let time_out = time_out.map(|t| t.with_timezone(&Local));

        // keep track of the day this is for
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

        // update for the student
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
    while let Some(mut session) = rx.recv().await {
        // send an initial response with the current data
        let data = data.read().await;
        let rq = ReplicateQuery::Full { data: &data };

        if let Err(err) = session.send(ServerMessage::EditorData(&rq)).await {
            error!("[Editor] Failed to send initial subscription response: {err}");
        }

        subs.write().await.insert(session.id, session);
    }

    panic!("[Editor] Add thread terminated unexpectedly");
}

#[allow(clippy::too_many_lines)]
async fn watch_thread(
    mut dates: Vec<NaiveDate>,
    subs: Arc<RwLock<HashMap<u64, Session>>>,
    data: Arc<RwLock<HashMap<String, Row>>>,
) -> Result<!, WsServerError> {
    let mut watcher = PgListener::connect(&env::var("DATABASE_URL")?).await?;
    watcher.listen("record_update").await?;

    info!("Listening for roster updates...");

    while let Ok(notification) = watcher.recv().await {
        let payload = notification.payload();
        debug!("Received notification: {payload}");

        // parse the payload as a JSON string
        let change: PgWatchUpdate = match serde_json::from_str(payload) {
            Ok(change) => change,
            Err(err) => {
                error!("Failed to parse roster change: {err}:{payload}");
                continue;
            }
        };

        let sign_in = change.sign_in.and_utc().with_timezone(&Local);
        let sign_out = change.sign_out.map(|t| t.and_utc().with_timezone(&Local));

        let rq: ReplicateQuery;

        match change.operation {
            Operation::Delete => {
                let mut rows = data.write().await;
                let Some(row) = rows.get_mut(&change.student_id) else {
                    warn!(
                        "Received delete operation for unknown student: {}",
                        &change.student_id[..7]
                    );
                    continue;
                };

                let day = sign_in.date_naive();

                let Some(Cell { entries, .. }) = row.cells.iter_mut().find(|cell| cell.date == day)
                else {
                    warn!(
                        "Received delete operation for student {} on unknown date: {}",
                        &change.student_id[..7],
                        day
                    );
                    continue;
                };

                // remove the entry for this date
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
                    warn!(
                        "Received insert operation for unknown student: {}",
                        &change.student_id[..7]
                    );
                    continue;
                };

                let Some(Cell { entries, .. }) = row.cells.iter_mut().find(|cell| cell.date == day)
                else {
                    warn!(
                        "Received insert operation for student {} on unknown date: {}",
                        &change.student_id[..7],
                        day
                    );
                    continue;
                };

                // create a new time entry for this change
                let entry = TimeEntry {
                    id: change.id,
                    start: sign_in,
                    end: sign_out,
                    kind: change.kind,
                };

                // add the entry for this date
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
                    warn!(
                        "Received update operation for unknown student: {}",
                        &change.student_id[..7]
                    );
                    continue;
                };

                let day = change.sign_in.and_utc().with_timezone(&Local).date_naive();

                let Some(Cell { entries, .. }) = row.cells.iter_mut().find(|cell| cell.date == day)
                else {
                    warn!(
                        "Received update operation for student {} on unknown date: {}",
                        &change.student_id[..7],
                        day
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
                        "Received update operation for student {} on date {} with unknown id: {}",
                        &change.student_id[..7],
                        day,
                        &change.id[..7]
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

        info!("[Editor] Broadcasting update to {} subscribers", subs.len());

        // send the update to all subscribers
        let futures = subs
            .values_mut()
            .map(|session| session.send(ServerMessage::EditorData(&rq)));

        futures_util::future::join_all(futures)
            .await
            .into_iter()
            .filter_map(Result::err)
            .for_each(|err| error!("[Editor] Failed to send update message: {err}"));
    }

    panic!("[Editor] Watch thread terminated unexpectedly");
}

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
            let mut query = String::from("UPDATE records SET ");

            for (i, update) in updates.iter().enumerate() {
                if i != 0 {
                    query.push_str(", ");
                }

                match update {
                    TimeEntryUpdate::Kind(kind) => {
                        write!(&mut query, "hour_type = '{kind}'")
                    }
                    TimeEntryUpdate::Start(start) => {
                        write!(&mut query, "sign_in = '{}'", start.naive_utc())
                    }
                    TimeEntryUpdate::End(end) => {
                        if let Some(end) = end {
                            write!(
                                &mut query,
                                "in_progress = false, sign_out = '{}'",
                                end.naive_utc()
                            )
                        } else {
                            write!(&mut query, "in_progress = true, sign_out = NULL")
                        }
                    }
                }?;
            }

            write!(&mut query, " WHERE id = '{entry_id}'")?;

            sqlx::query(&query).execute(pg).await?;
        }
        UpdateQuery::Delete { id } => {
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
            queries = queries
                .into_iter()
                .flat_map(|q| match q {
                    UpdateQuery::Batch(nested) => nested,
                    other => vec![other],
                })
                .collect();

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
    while let Some((message, session_id)) = rx.recv().await {
        let query: UpdateQuery = match serde_json::from_str(&message) {
            Ok(data) => data,
            Err(err) => {
                error!("[Editor] Failed to deserialize message: {err}");
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

        error!("[Editor] Failed to process update: {err}");
        warn!("[Editor] Sent error response to session {session_id}: {hr_error}");

        let mut subs = subscriptions.write().await;
        let Some(session) = subs.get_mut(&session_id) else {
            warn!("[Editor] Could not find session {session_id} to send error response");
            continue;
        };

        if let Err(err) = session
            .send(ServerMessage::Error {
                message: format!("{hr_error}"),
                meta: hr_error,
            })
            .await
        {
            error!("[Editor] Failed to send error message: {err}");
        }
    }

    panic!("[Editor] Update thread terminated unexpectedly");
}

async fn remove_thread(
    subs: Arc<RwLock<HashMap<u64, Session>>>,
    mut rx: mpsc::UnboundedReceiver<u64>,
) -> ! {
    while let Some(id) = rx.recv().await {
        subs.write().await.remove(&id);
    }

    panic!("[Editor] Remove thread terminated unexpectedly");
}

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
            error!("Failed to initialize roster data: {err}");
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
