use crate::{
    dbstream::{PartialRecord, Record},
    prelude::*,
};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
pub(crate) struct RecordEdit {
    pub(crate) admin_id: String,
    pub(crate) old: Record,
    #[serde(flatten)]
    #[oai(flatten)]
    pub(crate) updated: PartialRecord,
}

migrator! {
    RecordEdit {}
}
