use crate::prelude::*;

#[derive(Object, Debug)]
pub(super) struct StudentIdConfig {
    /// Length of the unhashed student ID.
    length: usize,
    /// Regular expression that the unhashed student ID must match.
    regex: String,
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum StudentIdError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

pub(super) async fn update(pg: &PgPool, new_config: StudentIdConfig) -> Result<(), StudentIdError> {
    sqlx::query!(
        r#"
        UPDATE student_id_config
        SET length = $1, regex = $2
        "#,
        new_config.length as i32,
        new_config.regex,
    )
    .execute(pg)
    .await?;

    Ok(())
}

pub(super) async fn query(pg: &PgPool) -> Result<StudentIdConfig, StudentIdError> {
    let record = sqlx::query!(r#"SELECT length, regex FROM student_id_config"#)
        .fetch_one(pg)
        .await?;

    Ok(StudentIdConfig {
        length: record.length as usize,
        regex: record.regex,
    })
}
