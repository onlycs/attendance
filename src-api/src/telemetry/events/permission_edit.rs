use crate::{auth::jwt::Permissions, prelude::*};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct PermissionEdit {
    /// Corresponds to the admin who performed the edit
    pub(crate) admin_id: String,
    /// Corresponds to the admin whose permissions were edited
    pub(crate) target_id: String,
    pub(crate) old: Permissions,
    pub(crate) new: Permissions,
}

migrator! {
    PermissionEdit {}
}
