use crate::{dbstream::Student, prelude::*};

pub type Request = Student;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(
    Request {
        id_hashed,
        id,
        first,
        last,
    }: Request,
    pg: PgPool,
) -> Result<(), Error> {
    sqlx::query!(
        r#"
        INSERT INTO students (id_hashed, id, first, last)
        VALUES ($1, $2, $3, $4)
        "#,
        id_hashed,
        id,
        first,
        last
    )
    .execute(&pg)
    .await?;

    Ok(())
}
