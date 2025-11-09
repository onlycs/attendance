use std::{collections::HashMap, env};

use chrono::{Local, NaiveDateTime};
use itertools::Itertools;
use serde::Deserialize;
use sqlx::{Pool, Postgres, postgres::PgListener};

use crate::{
    error::WsServerError,
    http::{roster::HourType, student::StudentData},
    ws::{
        connection::Connection,
        schema::{
            Cell, Entry, EntryFieldUpdate, OutgoingPayload, ReplicateEntryAdd,
            ReplicateEntryDelete, ReplicateEntryUpdate, ReplicateFull, ReplicateStudentAdd,
            ReplicateStudentDelete, ReplicateStudentUpdate, Replication, Row, StudentFieldUpdate,
            WsError,
        },
    },
};

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
enum Operation {
    Insert,
    Update,
    Delete,
}

#[derive(Clone, Debug, Deserialize)]
struct RecordPayload {
    operation: Operation,
    id: String,
    student_id: String,
    sign_in: NaiveDateTime,
    sign_out: Option<NaiveDateTime>,
    kind: HourType,
}

#[derive(Clone, Debug, Deserialize)]
struct StudentDataPayload {
    operation: Operation,
    id: String,
    hashed: String,
    first: String,
    last: String,
}

async fn record_watcher() -> Result<!, WsServerError> {
    let mut listener = PgListener::connect(&env::var("DATABASE_URL")?).await?;
    listener.listen("record_update").await?;

    info!(task = "ws::sql::records", "waiting for updates");

    while let Ok(notification) = listener.recv().await {
        let payload = notification.payload();
        let payload = match serde_json::from_str::<RecordPayload>(payload) {
            Ok(pl) => pl,
            Err(err) => {
                warn!(
                    task = "ws::sql::records",
                    error = %err,
                    "payload failed to parse"
                );
                continue;
            }
        };

        debug!(
            task = "ws::sql::records",
            payload = ?payload,
            "recieved payload"
        );

        let sign_in = payload.sign_in.and_utc().with_timezone(&Local);
        let sign_out = payload.sign_out.map(|t| t.and_utc().with_timezone(&Local));

        let repl = match payload.operation {
            Operation::Delete => Replication::DeleteEntry(ReplicateEntryDelete {
                hashed: payload.student_id,
                date: sign_in.date_naive(),
                id: payload.id,
            }),
            Operation::Insert => Replication::AddEntry(ReplicateEntryAdd {
                hashed: payload.student_id,
                date: sign_in.date_naive(),
                entry: Entry {
                    id: payload.id,
                    kind: payload.kind,
                    start: sign_in,
                    end: sign_out,
                },
            }),
            Operation::Update => Replication::UpdateEntry(ReplicateEntryUpdate {
                hashed: payload.student_id,
                date: sign_in.date_naive(),
                id: payload.id,
                updates: vec![
                    EntryFieldUpdate::Kind(payload.kind),
                    EntryFieldUpdate::Start(sign_in),
                    EntryFieldUpdate::End(sign_out),
                ],
            }),
        };

        Connection::send_all(OutgoingPayload::Replicate(repl)).await;
    }

    warn!(
        task = "ws::sql::records",
        "listener terminated unexpectedly... restarting"
    );
    Box::pin(record_watcher()).await?;
}

async fn student_watcher() -> Result<!, WsServerError> {
    let mut listener = PgListener::connect(&env::var("DATABASE_URL")?).await?;
    listener.listen("student_data_update").await?;

    info!(task = "ws::sql::students", "waiting for updates");

    while let Ok(notification) = listener.recv().await {
        let payload = notification.payload();
        let payload = match serde_json::from_str::<StudentDataPayload>(payload) {
            Ok(pl) => pl,
            Err(err) => {
                warn!(
                    task = "ws::sql::students",
                    error = %err,
                    "payload failed to parse"
                );
                continue;
            }
        };

        debug!(
            task = "ws::sql::students",
            payload = ?payload,
            "payload received"
        );

        let repl = match payload.operation {
            Operation::Delete => Replication::DeleteStudent(ReplicateStudentDelete {
                hashed: payload.hashed,
            }),
            Operation::Insert => Replication::AddStudent(ReplicateStudentAdd {
                id: payload.id,
                hashed: payload.hashed,
                first: payload.first,
                last: payload.last,
            }),
            Operation::Update => Replication::UpdateStudent(ReplicateStudentUpdate {
                hashed: payload.hashed,
                updates: vec![
                    StudentFieldUpdate::First(payload.first),
                    StudentFieldUpdate::Last(payload.last),
                ],
            }),
        };

        Connection::send_all(OutgoingPayload::Replicate(repl)).await;
    }

    warn!(
        task = "ws::sql::students",
        "listener terminated unexpectedly... restarting"
    );
    Box::pin(student_watcher()).await?;
}

pub fn spawn() {
    tokio::spawn(async move {
        loop {
            let Err(err) = record_watcher().await;
            error!(task = "ws::sql::records", error = %err, "record watcher failed... restarting");
        }
    });

    tokio::spawn(async move {
        loop {
            let Err(err) = student_watcher().await;
            error!(task = "ws::sql::students", error = %err, "student watcher failed... restarting");
        }
    });
}

#[instrument(
    name = "ws::sql::replicate",
    skip(repl, pg),
    fields(
        replication_type = %repl.as_ref(),
    ),
    err
)]
pub async fn replicate(repl: Replication, pg: &Pool<Postgres>) -> Result<(), WsError> {
    match repl {
        Replication::AddEntry(ReplicateEntryAdd { hashed, entry, .. }) => {
            sqlx::query!(
                r#"
                INSERT INTO records (id, student_id, sign_in, sign_out, hour_type, in_progress)
                VALUES ($1, $2, $3, $4, $5, $6)
                "#,
                cuid::cuid2(), // incoming ID is omitted, deserialized to ""
                hashed,
                entry.start.naive_utc(),
                entry.end.map(|t| t.naive_utc()),
                entry.kind as HourType,
                entry.end.is_none(),
            )
            .execute(pg)
            .await?;
        }
        Replication::UpdateEntry(ReplicateEntryUpdate { id, updates, .. }) => {
            let mut tx = pg.begin().await?;

            for update in updates {
                match update {
                    EntryFieldUpdate::Kind(kind) => {
                        sqlx::query!(
                            r#"
                            UPDATE records
                            SET hour_type = $1
                            WHERE id = $2
                            "#,
                            kind as HourType,
                            id,
                        )
                        .execute(&mut *tx)
                        .await?;
                    }
                    EntryFieldUpdate::Start(start) => {
                        sqlx::query!(
                            r#"
                            UPDATE records
                            SET sign_in = $1
                            WHERE id = $2
                            "#,
                            start.naive_utc(),
                            id,
                        )
                        .execute(&mut *tx)
                        .await?;
                    }
                    EntryFieldUpdate::End(end) => {
                        sqlx::query!(
                            r#"
                            UPDATE records
                            SET sign_out = $1, in_progress = $2
                            WHERE id = $3
                            "#,
                            end.map(|t| t.naive_utc()),
                            end.is_none(),
                            id,
                        )
                        .execute(&mut *tx)
                        .await?;
                    }
                }
            }

            tx.commit().await?;
        }

        Replication::DeleteEntry(ReplicateEntryDelete { id, .. }) => {
            sqlx::query!(
                r#"
                DELETE FROM records
                WHERE id = $1
                "#,
                id,
            )
            .execute(pg)
            .await?;
        }

        Replication::AddStudent(ReplicateStudentAdd {
            id,
            hashed,
            first,
            last,
        }) => {
            sqlx::query!(
                r#"
                INSERT INTO student_data (id, hashed, first, last)
                VALUES ($1, $2, $3, $4)
                "#,
                id,
                hashed,
                first,
                last,
            )
            .execute(pg)
            .await?;
        }

        Replication::UpdateStudent(ReplicateStudentUpdate { hashed, updates }) => {
            let mut tx = pg.begin().await?;

            for update in updates {
                match update {
                    StudentFieldUpdate::First(first) => {
                        sqlx::query!(
                            r#"
                            UPDATE student_data
                            SET first = $1
                            WHERE hashed = $2
                            "#,
                            first,
                            hashed,
                        )
                        .execute(&mut *tx)
                        .await?;
                    }
                    StudentFieldUpdate::Last(last) => {
                        sqlx::query!(
                            r#"
                            UPDATE student_data
                            SET last = $1
                            WHERE hashed = $2
                            "#,
                            last,
                            hashed,
                        )
                        .execute(&mut *tx)
                        .await?;
                    }
                }
            }

            tx.commit().await?;
        }

        Replication::DeleteStudent(ReplicateStudentDelete { hashed }) => {
            sqlx::query!(
                r#"
                DELETE FROM student_data
                WHERE hashed = $1
                "#,
                hashed,
            )
            .execute(pg)
            .await?;
        }

        Replication::Full(_) => {
            // we should not receive full replications here
            // I'm trying to use the same Replication type for both incoming and outgoing
            // replications (you'll see some unused params when we get incoming stuff)
            // this would have otherwise been caught by serde
            return Err(WsError::Data);
        }
    }

    Ok(())
}

pub async fn full(pg: &Pool<Postgres>) -> Result<ReplicateFull, WsError> {
    let records = sqlx::query!(
        r#"
        SELECT id, student_id, hour_type as "kind: HourType", sign_in, sign_out
        FROM records
        "#
    )
    .fetch_all(pg)
    .await?
    .into_iter()
    .fold(HashMap::new(), |mut acc, rec| {
        acc.entry(rec.student_id.clone())
            .or_insert_with(Vec::new)
            .push(rec);
        acc
    });

    let students = sqlx::query_as!(
        StudentData,
        r#"
        SELECT id, hashed, first, last
        FROM student_data
        "#
    )
    .fetch_all(pg)
    .await?;

    let mut rows = Vec::with_capacity(students.len());

    let mut init_cells = records
        .values()
        .flatten()
        .map(|r| r.sign_in.and_utc().with_timezone(&Local).date_naive())
        .sorted()
        .dedup()
        .map(|date| Cell {
            date,
            entries: Vec::new(),
        })
        .collect::<Vec<_>>();

    init_cells.reverse();

    for student in students {
        let mut cells = init_cells.clone();

        if let Some(student_records) = records.get(&student.hashed) {
            for record in student_records {
                let sign_in = record.sign_in.and_utc().with_timezone(&Local);
                let sign_out = record.sign_out.map(|t| t.and_utc().with_timezone(&Local));
                if let Some(cell) = cells.iter_mut().find(|c| c.date == sign_in.date_naive()) {
                    cell.entries.push(Entry {
                        id: record.id.clone(),
                        kind: record.kind,
                        start: sign_in,
                        end: sign_out,
                    });
                }
            }
        }

        rows.push(Row { student, cells });
    }

    Ok(ReplicateFull { data: rows })
}
