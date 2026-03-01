use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
pub(crate) struct AdminLogin {
    pub(crate) id: String,
}

migrator! {
    AdminLogin {}
}
