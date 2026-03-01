use crate::{dbstream::Student, prelude::*};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
pub(crate) struct StudentDelete {
    pub(crate) admin_id: String,
    #[serde(flatten)]
    #[oai(flatten)]
    pub(crate) student: Student,
}

migrator! {
    StudentDelete {}
}
