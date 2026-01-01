use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct AdminLogout {
    pub id: String,
}

migrator! {
    AdminLogout {}
}
