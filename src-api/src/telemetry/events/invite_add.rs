use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
pub(crate) struct InviteAdd {
    pub(crate) admin_id: String,
}

migrator! {
    InviteAdd {}
}
