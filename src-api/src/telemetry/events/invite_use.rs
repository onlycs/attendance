use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct InviteUse {
    pub inviter_id: String,
    pub invitee_id: String,
}

migrator! {
    InviteUse {}
}
