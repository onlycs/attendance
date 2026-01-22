use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct Onboard {
    pub admin_id: String,
}

migrator! {
    Onboard {}
}
