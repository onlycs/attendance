use crate::{dbstream::Record, prelude::*};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct RecordAdd {
    pub admin_id: String,
    #[serde(flatten)]
    #[oai(flatten)]
    pub record: Record,
}

migrator! {
    RecordAdd {}
}
