use crate::prelude::*;

#[derive(Object, Debug)]
pub(super) struct StudentIdConfig {
    /// Minimum length of the unhashed student ID.
    min: usize,
    /// Maximum length of the unhashed student ID.
    max: usize,
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
        SET min = $1, max = $2, regex = $3
        "#,
        new_config.min as i32,
        new_config.max as i32,
        new_config.regex,
    )
    .execute(pg)
    .await?;

    Ok(())
}

pub(super) async fn query(pg: &PgPool) -> Result<StudentIdConfig, StudentIdError> {
    let record = sqlx::query!(r#"SELECT min, max, regex FROM student_id_config"#)
        .fetch_one(pg)
        .await?;

    Ok(StudentIdConfig {
        min: record.min as usize,
        max: record.max as usize,
        regex: record.regex,
    })
}
