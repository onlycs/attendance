use std::collections::{HashMap, HashSet};

use chrono::{NaiveDate, NaiveDateTime};
use chrono_tz::US;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgListener, PgPool};
use tokio::sync::mpsc::Sender;

use crate::http::roster::HourType;

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
pub struct Row {
    pub id: String,
    pub dates: Vec<(NaiveDate, Vec<TimeEntry>)>,
}

impl Row {
    #[allow(clippy::too_many_lines)]
    pub async fn start(
        sender: Sender<HashMap<String, Row>>,
        pg: &PgPool,
    ) -> Result<!, sqlx::Error> {
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
                    row.dates.push((day, vec![]));
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
                    dates: added_dates.iter().map(|&d| (d, vec![])).collect(),
                })
                .dates
                .last_mut()
                .unwrap()
                .1
                .push(entry);
        }

        // send the initial data
        if sender.send(rows.clone()).await.is_err() {
            error!("Failed to send initial roster data.");
        }

        // listen for changes
        let mut watcher = PgListener::connect_with(pg).await?;
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
                    let Some(row) = rows.get_mut(&change.student_id) else {
                        warn!(
                            "Received delete operation for unknown student: {}",
                            &change.student_id[..7]
                        );
                        continue;
                    };

                    let day = change.sign_in.date();

                    let Some((_, entries)) = row.dates.iter_mut().find(|(d, _)| *d == day) else {
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

                    if added_dates.insert(day) {
                        // if we haven't seen this day before, we need to add it to every row
                        for row in rows.values_mut() {
                            row.dates.push((day, vec![]));
                            row.dates.sort_by_key(|(d, _)| *d);
                        }
                    }

                    let Some(row) = rows.get_mut(&change.student_id) else {
                        warn!(
                            "Received insert operation for unknown student: {}",
                            &change.student_id[..7]
                        );
                        continue;
                    };

                    let Some((_, entries)) = row.dates.iter_mut().find(|(d, _)| *d == day) else {
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
                    let Some(row) = rows.get_mut(&change.student_id) else {
                        warn!(
                            "Received update operation for unknown student: {}",
                            &change.student_id[..7]
                        );
                        continue;
                    };

                    let day = change.sign_in.date();

                    let Some((_, entries)) = row.dates.iter_mut().find(|(d, _)| *d == day) else {
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
        }

        panic!("Roster change listener stopped unexpectedly");
    }
}
