use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct AdminLogin {
    pub id: String,
}

migrator! {
    AdminLogin {}
}
