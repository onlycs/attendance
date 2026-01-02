use crate::{
    dbstream::{PartialRecord, Record},
    prelude::*,
};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct RecordEdit {
    pub admin_id: String,
    pub old: Record,
    #[serde(flatten)]
    #[oai(flatten)]
    pub updated: PartialRecord,
}

migrator! {
    RecordEdit {}
}
