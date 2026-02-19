use crate::{dbstream::Admin, prelude::*};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct AdminDelete {
    pub(crate) admin_id: String,
    pub(crate) target: Admin,
}

migrator! {
    AdminDelete {}
}
