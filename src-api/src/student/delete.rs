use crate::{dbstream::Student, prelude::*};

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

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(id_hashed: String, pg: PgPool) -> Result<Response, Error> {
    let record = sqlx::query!(
        r#"
        DELETE FROM students
        WHERE id_hashed = $1
        RETURNING id, first, last
        "#,
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
