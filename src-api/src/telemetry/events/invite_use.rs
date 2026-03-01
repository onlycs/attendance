use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
pub(crate) struct InviteUse {
    pub(crate) inviter_id: String,
    pub(crate) invitee_id: String,
}

migrator! {
    InviteUse {}
}
