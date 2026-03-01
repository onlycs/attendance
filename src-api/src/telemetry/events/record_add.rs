use crate::{dbstream::Record, prelude::*};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
pub(crate) struct RecordAdd {
    pub(crate) admin_id: String,
    #[serde(flatten)]
    #[oai(flatten)]
    pub(crate) record: Record,
}

migrator! {
    RecordAdd {}
}
