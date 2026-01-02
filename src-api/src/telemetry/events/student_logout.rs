use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct StudentLogout {
    pub sid_hashed: String,
    pub record_id: String,
    pub admin_id: String,
}

migrator! {
    StudentLogout {}
}
