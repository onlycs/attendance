use crate::{
    dbstream::{Admin, PartialAdmin},
    prelude::*,
};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct AdminEdit {
    /// Corresponds to the admin who performed the edit
    pub(crate) admin_id: String,
    pub(crate) old: Admin,
    #[serde(flatten)]
    #[oai(flatten)]
    pub(crate) updated: PartialAdmin,
}

migrator! {
    AdminEdit {}
}
