use std::{backtrace::Backtrace, panic::Location};

use chrono::{DateTime, Local, NaiveDate};
use serde::{Deserialize, Serialize};
use strum::AsRefStr;
use thiserror::Error;

use crate::{
    http::{roster::HourType, student::StudentData},
    prelude::*,
};

#[derive(Clone, Debug, Deserialize)]
pub struct AuthenticatePayload {
    pub token: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Entry {
    #[serde(default)]
    pub id: String,
    pub kind: HourType,
    #[serde(with = "chrono_temporal")]
    pub start: DateTime<Local>,
    #[serde(with = "chrono_temporal::optional")]
    pub end: Option<DateTime<Local>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cell {
    pub date: NaiveDate,
    pub entries: Vec<Entry>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Row {
    pub student: StudentData,
    pub cells: Vec<Cell>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReplicateEntryAdd {
    pub hashed: String,
    pub date: NaiveDate,
    pub entry: Entry,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "key", content = "value", rename_all = "lowercase")]
pub enum EntryFieldUpdate {
    Kind(HourType),
    Start(DateTime<Local>),
    End(Option<DateTime<Local>>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReplicateEntryUpdate {
    pub hashed: String,
    pub date: NaiveDate,
    pub id: String,
    pub updates: Vec<EntryFieldUpdate>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReplicateEntryDelete {
    pub hashed: String,
    pub date: NaiveDate,
    pub id: String,
}

pub type ReplicateStudentAdd = StudentData;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "key", content = "value", rename_all = "lowercase")]
pub enum StudentFieldUpdate {
    First(String),
    Last(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReplicateStudentUpdate {
    pub hashed: String,
    pub updates: Vec<StudentFieldUpdate>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReplicateStudentDelete {
    pub hashed: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ReplicateFull {
    pub data: Vec<Row>,
}

#[derive(Clone, Debug, Serialize, Deserialize, AsRefStr)]
#[serde(tag = "type")]
pub enum Replication {
    AddEntry(ReplicateEntryAdd),
    UpdateEntry(ReplicateEntryUpdate),
    DeleteEntry(ReplicateEntryDelete),
    AddStudent(ReplicateStudentAdd),
    UpdateStudent(ReplicateStudentUpdate),
    DeleteStudent(ReplicateStudentDelete),
    Full(ReplicateFull),
}

#[serde_as]
#[derive(Error, Debug, Serialize)]
#[serde(tag = "type")]
pub enum WsError {
    #[error("At {location}: Serde error: {source}")]
    Serde {
        #[from]
        #[serde_as(as = "DisplayFromStr")]
        source: serde_json::Error,
        #[serde_as(as = "DisplayFromStr")]
        location: &'static Location<'static>,
        #[serde(skip)]
        backtrace: Backtrace,
    },

    #[error("At {location}: Sqlx error: {source}")]
    Sqlx {
        #[from]
        #[serde_as(as = "DisplayFromStr")]
        source: sqlx::Error,
        #[serde_as(as = "DisplayFromStr")]
        location: &'static Location<'static>,
        #[serde(skip)]
        backtrace: Backtrace,
    },

    #[error("At {location}: Websocket connection closed")]
    Closed {
        #[from]
        #[serde_as(as = "DisplayFromStr")]
        source: actix_ws::Closed,
        #[serde_as(as = "DisplayFromStr")]
        location: &'static Location<'static>,
        #[serde(skip)]
        backtrace: Backtrace,
    },

    #[error("Invalid update. The database was not updated.")]
    Data,

    #[error("Failed to authenticate")]
    Auth,
}

#[derive(Debug, Serialize)]
pub struct ErrorPayload {
    pub message: String,
    pub meta: WsError,
}

#[derive(Clone, Debug, Deserialize, AsRefStr)]
#[serde(tag = "type", content = "data")]
pub enum IncomingPayload {
    Authenticate(AuthenticatePayload),
    Replicate(Replication),
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum OutgoingPayload {
    Replicate(Replication),
    Error(ErrorPayload),
}
