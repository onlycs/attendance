use crate::{dbstream::Student, prelude::*};

pub(super) type Response = Student;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    /// No student with the given ID exists
    #[oai(status = 404)]
    #[construct("Student not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(
    id_hashed: String,
    claims: jwt::Claims,
    pg: PgPool,
) -> Result<Response, Error> {
    let student = sqlx::query_as!(
        Student,
        r#"
        DELETE FROM students
        WHERE id_hashed = $1
        RETURNING *
        "#,
        id_hashed,
    )
    .fetch_optional(&pg)
    .await?
    .ok_or(Error::not_found())?;

    let student_telemeter = student.clone();
    tokio::spawn(async move {
        telemeter(
            StudentDelete {
                admin_id: claims.sub,
                student: student_telemeter,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(student)
}
