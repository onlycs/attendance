use crate::prelude::*;

#[derive(Object)]
#[oai(rename = "StudentAddRequest")]
pub(super) struct Request {
    sid_hashed: String,
    student_id: String,
    first: String,
    last: String,
}

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
        sid_hashed,
        student_id,
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
        sid_hashed,
        student_id,
        first,
        last
    )
    .execute(&pg)
    .await?;

    Ok(())
}
