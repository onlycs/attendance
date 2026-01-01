use crate::{dbstream::Student, prelude::*};

pub(super) type Response = Student;

#[derive(Object)]
#[oai(rename = "StudentListResponse")]
pub(super) struct ListResponse {
    students: Vec<Student>,
}

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
pub(super) async fn route(sid_hashed: String, pg: PgPool) -> Result<Response, Error> {
    let record = sqlx::query!(
        r#"
        SELECT id, first, last FROM students
        WHERE id_hashed = $1
        "#,
        sid_hashed,
    )
    .fetch_optional(&pg)
    .await?
    .ok_or(Error::not_found())?;

    Ok(Response {
        id: record.id,
        id_hashed: sid_hashed,
        first: record.first,
        last: record.last,
    })
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn all(pg: PgPool) -> Result<ListResponse, Error> {
    let records = sqlx::query!(
        r#"
        SELECT id_hashed, id, first, last FROM students
        "#
    )
    .fetch_all(&pg)
    .await?;

    let students = records
        .into_iter()
        .map(|record| Student {
            id: record.id,
            id_hashed: record.id_hashed,
            first: record.first,
            last: record.last,
        })
        .collect();

    Ok(ListResponse { students })
}
