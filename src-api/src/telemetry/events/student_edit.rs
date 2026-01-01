use crate::{
    dbstream::{PartialStudent, Student},
    prelude::*,
};

#[derive(Clone, Debug, Serialize, Deserialize, Object)]
#[serde(from = "Migrator")]
pub(crate) struct StudentEdit {
    pub admin_id: String,
    pub old: Student,
    #[serde(flatten)]
    #[oai(flatten)]
    pub updated: PartialStudent,
}

migrator! {
    StudentEdit {}
}
