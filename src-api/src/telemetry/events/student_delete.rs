use crate::{dbstream::Student, prelude::*};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct StudentDelete {
    pub admin_id: String,
    #[serde(flatten)]
    #[oai(flatten)]
    pub student: Student,
}

migrator! {
    StudentDelete {}
}
