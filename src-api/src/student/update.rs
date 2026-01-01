use crate::{dbstream::Student, prelude::*};

#[derive(Object)]
#[oai(rename = "StudentUpdateRequest")]
pub(super) struct Request {
    id: Option<String>,
    first: Option<String>,
    last: Option<String>,
}

pub(super) type Response = Student;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 404)]
    #[construct("Student not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(name = "student::update", skip(pg), err)]
pub(super) async fn route(
    id_hashed: String,
    Request { id, first, last }: Request,
    pg: PgPool,
) -> Result<Response, Error> {
    let record = sqlx::query!(
        r#"
        UPDATE students
        SET id = COALESCE($1, id),
            first = COALESCE($2, first),
            last = COALESCE($3, last)
        WHERE id_hashed = $4
        RETURNING id, first, last
        "#,
        id,
        first,
        last,
        id_hashed,
    )
    .fetch_optional(&pg)
    .await?
    .ok_or(Error::not_found())?;

    Ok(Response {
        id: record.id,
        id_hashed,
        first: record.first,
        last: record.last,
    })
}
