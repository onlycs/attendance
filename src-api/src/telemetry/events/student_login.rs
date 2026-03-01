use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
pub(crate) struct StudentLogin {
    pub(crate) sid_hashed: String,
    pub(crate) record_id: String,
    pub(crate) admin_id: String,
}

migrator! {
    StudentLogin {}
}
