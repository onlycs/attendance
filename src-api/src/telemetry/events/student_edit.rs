use crate::{
    dbstream::{PartialStudent, Student},
    prelude::*,
};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
pub(crate) struct StudentEdit {
    pub(crate) admin_id: String,
    pub(crate) old: Student,
    #[serde(flatten)]
    #[oai(flatten)]
    pub(crate) updated: PartialStudent,
}

migrator! {
    StudentEdit {}
}
