use std::{collections::HashMap, fmt::Debug, hash::Hash};

use poem_openapi::{
    Union,
    types::{IsObjectType, ParseFromJSON, ToJSON, Type},
};
use sqlx::postgres::PgRow;

use crate::prelude::*;

pub(crate) trait Identifiable<K: Hash + Eq + Clone>: Sized {
    fn pkey(&self) -> &K;
}

pub(crate) trait ApplyTo<R: Row>: Identifiable<R::Key> {
    fn apply(self, row: &mut R);
}

pub(crate) trait Row:
    Identifiable<Self::Key>
    + for<'r> sqlx::FromRow<'r, PgRow>
    + for<'de> Deserialize<'de>
    + Type
    + IsObjectType
    + ParseFromJSON
    + ToJSON
    + Clone
    + Unpin
    + Send
    + Sync
    + 'static
{
    const NAME: &'static str;
    type Key: for<'de> Deserialize<'de>
        + Serialize
        + Type
        + ParseFromJSON
        + ToJSON
        + Debug
        + Hash
        + Eq
        + Clone
        + Send
        + Sync
        + 'static;

    type Partial: ApplyTo<Self>
        + for<'de> Deserialize<'de>
        + Type
        + IsObjectType
        + ParseFromJSON
        + ToJSON
        + Clone
        + Send
        + Sync
        + 'static;

    async fn select_all(pg: &PgPool) -> Result<HashMap<Self::Key, Self>, sqlx::Error> {
        let rows = sqlx::query_as::<_, Self>(&format!("SELECT * FROM {}", Self::NAME))
            .fetch_all(pg)
            .await?;

        Ok(rows
            .into_iter()
            .map(|row| (row.pkey().clone(), row))
            .collect())
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Object)]
#[serde(bound(deserialize = "R: Row", serialize = "R: Row"))]
pub struct Deletion<R: Row> {
    pkey: R::Key,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Union, strum::EnumDiscriminants)]
#[strum_discriminants(name(ReplicationType))]
#[serde(
    tag = "operation",
    rename_all = "UPPERCASE",
    bound(deserialize = "R: Row")
)]
#[oai(discriminator_name = "operation", rename_all = "UPPERCASE")]
pub(crate) enum Replication<R: Row> {
    Insert(R),
    Update(R::Partial),
    Delete(Deletion<R>),
}

impl<R: Row> Replication<R> {
    pub(super) fn replicate(self, map: &mut HashMap<R::Key, R>) -> Option<R> {
        match self {
            Replication::Insert(row) => {
                map.insert(row.pkey().clone(), row.clone());
                Some(row)
            }
            Replication::Update(partial) => {
                if let Some(row) = map.get_mut(partial.pkey()) {
                    partial.apply(row);
                    return Some(row.clone());
                }
                None
            }
            Replication::Delete(Deletion { pkey }) => map.remove(&pkey),
        }
    }
}
