use std::collections::HashMap;

use crate::{
    dbstream::{Admin, Row},
    prelude::*,
};

pub(super) type Response = Admin;

#[derive(Object)]
#[oai(rename = "AdminQueryManyResponse")]
pub(super) struct QueryManyResponse {
    admins: HashMap<<Admin as Row>::Key, Admin>,
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum QueryManyError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    /// Admin with the given ID does not exist
    #[oai(status = 404)]
    #[construct("Admin not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn many(pg: PgPool) -> Result<QueryManyResponse, QueryManyError> {
    let admins = Admin::select_all(&pg).await?;
    return Ok(QueryManyResponse { admins });
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn one(id: String, pg: PgPool) -> Result<Response, Error> {
    let admin = sqlx::query_as::<_, Admin>(
        r#"
        SELECT *
        FROM admins
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pg)
    .await?
    .ok_or(Error::not_found())?;

    Ok(admin)
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn permissions(id: String, pg: PgPool) -> Result<jwt::Permissions, Error> {
    jwt::Permissions::fetch(&id, &pg)
        .await?
        .ok_or(Error::not_found())
}
