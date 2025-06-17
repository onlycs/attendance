use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

use actix_web::rt;
use chrono::{NaiveDate, NaiveDateTime};
use chrono_tz::US;
use serde::{Deserialize, Serialize};
use serde_with::SerializeDisplay;
use sqlx::{postgres::PgListener, PgPool};
use tokio::sync::{mpsc, RwLock};

use crate::{
    http::roster::HourType,
    ws::{message::ServerMessage, pool::SubPool, session::Session},
};

#[derive(Deserialize)]
#[serde(rename_all = "UPPERCASE")]
enum Operation {
    Insert,
    Update,
    Delete,
}

#[derive(Deserialize)]
struct RosterChange {
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
    pub start: NaiveDateTime,
    pub end: Option<NaiveDateTime>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Cell {
    pub date: NaiveDate,
    pub entries: Vec<TimeEntry>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Row {
    pub id: String,
    pub dates: Vec<Cell>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "type", content = "data")]
#[serde(rename_all = "camelCase")]
pub enum Query {
    Create {
        student_id: String,
        sign_in: NaiveDateTime,
        sign_out: Option<NaiveDateTime>,
        hour_type: HourType,
    },

    Update {
        entry_id: String,
        sign_in: NaiveDateTime,
        sign_out: Option<NaiveDateTime>,
        hour_type: HourType,
    },

    Delete {
        entry_id: Option<String>,
    },
}

async fn init(pg: &PgPool) -> Result<(HashSet<NaiveDate>, HashMap<String, Row>), sqlx::Error> {
    let initial =
        sqlx::query!(
            r#"
            SELECT id, student_id, sign_in, sign_out, hour_type as "hour_type: HourType" FROM records
            ORDER BY sign_in
            "#
        )
            .fetch_all(pg)
            .await?;

    let mut added_dates = HashSet::new();
    let mut rows = HashMap::<String, Row>::new();

    for record in initial {
        let student_id = &record.student_id;
        let time_in = record.sign_in;
        let time_out = record.sign_out;

        // times are stored as utc, we can convert them to non-naive datetime
        let time_in = time_in.and_utc();
        let time_out = time_out.map(|t| t.and_utc());

        // i want to give them back as local, i.e. America/New_York
        let time_in = time_in.with_timezone(&US::Eastern);
        let time_out = time_out.map(|t| t.with_timezone(&US::Eastern));

        // keep track of the day this is for
        let day = time_in.date_naive();

        // if we haven't seen this day before, we need to add it to every row
        if added_dates.insert(day) {
            for row in rows.values_mut() {
                row.dates.push(Cell {
                    date: day,
                    entries: vec![],
                });
            }
        }

        let entry = TimeEntry {
            id: record.id,
            start: time_in.naive_utc(),
            end: time_out.map(|t| t.naive_utc()),
            kind: record.hour_type,
        };

        // update for the student
        rows.entry(student_id.clone())
            .or_insert_with(|| Row {
                id: student_id.clone(),
                dates: added_dates
                    .iter()
                    .map(|&d| Cell {
                        date: d,
                        entries: vec![],
                    })
                    .collect(),
            })
            .dates
            .last_mut()
            .unwrap()
            .entries
            .push(entry);
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

        let data = match serde_json::to_string(&*data) {
            Ok(data) => data,
            Err(err) => {
                error!("[Editor] Failed to serialize initial data: {err}");
                continue;
            }
        };

        if let Err(err) = session.send(ServerMessage::EditorData(data)).await {
            error!("[Editor] Failed to send initial subscription response: {err}");
        }

        subs.write().await.insert(session.id, session);
    }

    panic!("[Editor] Add thread terminated unexpectedly");
}

#[allow(clippy::too_many_lines)]
async fn watch_thread(
    pg: Arc<PgPool>,
    mut dates: HashSet<NaiveDate>,
    subs: Arc<RwLock<HashMap<u64, Session>>>,
    data: Arc<RwLock<HashMap<String, Row>>>,
) -> Result<!, sqlx::Error> {
    let mut watcher = PgListener::connect_with(&pg).await?;
    watcher.listen("on_record_update").await?;

    while let Ok(notification) = watcher.recv().await {
        let payload = notification.payload();
        debug!("Received notification: {payload}");

        // parse the payload as a JSON string
        let change: RosterChange = match serde_json::from_str(payload) {
            Ok(change) => change,
            Err(err) => {
                error!("Failed to parse roster change: {err}");
                continue;
            }
        };

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

                let day = change.sign_in.date();

                let Some(Cell { entries, .. }) = row.dates.iter_mut().find(|cell| cell.date == day)
                else {
                    warn!(
                        "Received delete operation for student {} on unknown date: {}",
                        &change.student_id[..7],
                        day
                    );
                    continue;
                };

                // remove the entry for this date
                entries.retain(|entry| entry.start != change.sign_in);
            }
            Operation::Insert => {
                let day = change.sign_in.date();
                let mut rows = data.write().await;

                if dates.insert(day) {
                    // if we haven't seen this day before, we need to add it to every row
                    for row in rows.values_mut() {
                        row.dates.push(Cell {
                            date: day,
                            entries: vec![],
                        });
                        row.dates.sort_by_key(|cell| cell.date);
                    }
                }

                let Some(row) = rows.get_mut(&change.student_id) else {
                    warn!(
                        "Received insert operation for unknown student: {}",
                        &change.student_id[..7]
                    );
                    continue;
                };

                let Some(Cell { entries, .. }) = row.dates.iter_mut().find(|cell| cell.date == day)
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
                    start: change.sign_in,
                    end: change.sign_out,
                    kind: change.kind,
                };

                // add the entry for this date
                entries.push(entry);
                entries.sort_by_key(|e| e.start);
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

                let day = change.sign_in.date();

                let Some(Cell { entries, .. }) = row.dates.iter_mut().find(|cell| cell.date == day)
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
                if let Some(entry) = entries.iter_mut().find(|e| e.id == change.id) {
                    entry.start = change.sign_in;
                    entry.end = change.sign_out;
                    entry.kind = change.kind;
                } else {
                    warn!(
                        "Received update operation for student {} on date {} with unknown id: {}",
                        &change.student_id[..7],
                        day,
                        &change.id[..7]
                    );
                }
            }
        }

        // serialize the updated data
        let data = match serde_json::to_string(&*data.read().await) {
            Ok(data) => data,
            Err(err) => {
                error!("Failed to serialize updated data: {err}");
                continue;
            }
        };

        let mut subs = subs.write().await;

        // send the update to all subscribers
        let futures = subs
            .values_mut()
            .map(|session| session.send(ServerMessage::EditorData(data.clone())));

        futures_util::future::join_all(futures)
            .await
            .into_iter()
            .filter_map(Result::err)
            .for_each(|err| error!("[Editor] Failed to send update message: {err}"));
    }

    panic!("[Editor] Watch thread terminated unexpectedly");
}

async fn update_thread(pg: Arc<PgPool>, mut rx: mpsc::UnboundedReceiver<String>) -> ! {
    while let Some(message) = rx.recv().await {
        let query: Query = match serde_json::from_str(&message) {
            Ok(data) => data,
            Err(err) => {
                error!("[Editor] Failed to deserialize message: {err}");
                continue;
            }
        };

        let result = match query {
            Query::Create {
                student_id,
                sign_in,
                sign_out,
                hour_type,
            } => sqlx::query!(
                r#"
                    INSERT INTO records (student_id, in_progress, sign_in, sign_out, hour_type)
                    VALUES ($1, $2, $3, $4, $5);
                    "#,
                student_id,
                sign_out.is_none(),
                sign_in,
                sign_out,
                hour_type as HourType
            )
            .execute(&*pg)
            .await
            .err(),
            Query::Update {
                entry_id,
                sign_in,
                sign_out,
                hour_type,
            } => sqlx::query!(
                r#"
                    UPDATE records
                    SET sign_in = $2, sign_out = $3, hour_type = $4
                    WHERE id = $1
                    "#,
                entry_id,
                sign_in,
                sign_out,
                hour_type as HourType
            )
            .execute(&*pg)
            .await
            .err(),
            Query::Delete { entry_id } => sqlx::query!(
                r#"
                    DELETE FROM records
                    WHERE id = $1
                    "#,
                entry_id
            )
            .execute(&*pg)
            .await
            .err(),
        };

        if let Some(err) = result {
            error!("[Editor] Failed to update database: {err}");
        }
    }

    panic!("[Editor] Update thread terminated unexpectedly");
}

pub fn pool(pg: Arc<PgPool>) -> Arc<SubPool> {
    let (add_tx, add_rx) = mpsc::unbounded_channel::<Session>();
    let (remove_tx, mut remove_rx) = mpsc::unbounded_channel();
    let (update_tx, update_rx) = mpsc::unbounded_channel::<String>();

    let task = rt::spawn(async move {
        let subscriptions_add = Arc::new(RwLock::new(HashMap::new()));
        let subscriptions_remove = Arc::clone(&subscriptions_add);
        let subscriptions_listen = Arc::clone(&subscriptions_add);

        let pool_listen = Arc::clone(&pg);
        let pool_update = Arc::clone(&pg);

        let (dates, data) = init(&pg).await.unwrap_or_else(|err| {
            error!("Failed to initialize roster data: {err}");
            (HashSet::new(), HashMap::new())
        });

        let data_add = Arc::new(RwLock::new(data));
        let data_listener = Arc::clone(&data_add);

        rt::spawn(add_thread(
            Arc::clone(&subscriptions_add),
            add_rx,
            data_listener.clone(),
        ));

        rt::spawn(watch_thread(
            pool_listen,
            dates,
            Arc::clone(&subscriptions_listen),
            data_add,
        ));

        rt::spawn(update_thread(pool_update, update_rx));

        rt::spawn(async move {
            while let Some(to_remove) = remove_rx.recv().await {
                subscriptions_remove.write().await.remove(&to_remove);
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
