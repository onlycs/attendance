use super::prelude::*;
use crate::dbstream::Student;

pub(super) type StartResponse = Vec<Student>;

#[derive(ApiResponse, ApiError)]
pub(super) enum StartError {
    #[oai(status = 401)]
    #[construct(setup, "Already set up")]
    #[construct(key, "Invalid setup key")]
    Unauthorized(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(Object)]
#[oai(rename = "OnboardFinishRequest")]
pub(super) struct FinishRequest {
    students: Vec<Student>,
    #[oai(flatten)]
    register: super::register::FinishRequest,
}

#[derive(ApiResponse, ApiError)]
#[from(super::register::FinishError)]
pub(super) enum FinishError {
    #[oai(status = 400)]
    #[construct(student, "Mismatched student list")]
    BadRequest(PlainText<String>),

    #[oai(status = 401)]
    #[construct(setup, "Already set up")]
    #[construct(key, "Invalid setup key")]
    Unauthorized(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
pub(super) enum SetupKeyError {
    #[oai(status = 401)]
    #[construct("Already set up")]
    Unauthorized(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    #[from(serde_json::Error, "Serialization error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn start(pg: PgPool, key: String) -> Result<Vec<Student>, StartError> {
    let None = sqlx::query!(r#"SELECT * FROM admins LIMIT 1"#)
        .fetch_optional(&pg)
        .await?
    else {
        return Err(StartError::setup());
    };

    if sqlx::query!(
        r#"
        SELECT * FROM register_sessions
        WHERE id = $1 AND expiry > NOW()
        "#,
        key
    )
    .fetch_optional(&pg)
    .await?
    .is_none()
    {
        return Err(StartError::key());
    }

    let students = sqlx::query_as!(Student, "SELECT * FROM students")
        .fetch_all(&pg)
        .await?;

    Ok(students)
}

#[tracing::instrument(skip(pg, students), err)]
pub(super) async fn finish(
    FinishRequest { students, register }: FinishRequest,
    pg: PgPool,
) -> Result<(), FinishError> {
    let None = sqlx::query!(r#"SELECT * FROM admins LIMIT 1"#)
        .fetch_optional(&pg)
        .await?
    else {
        return Err(FinishError::setup());
    };

    if sqlx::query!(
        r#"
        SELECT id FROM register_sessions
        WHERE id = $1 AND expiry > NOW()
        "#,
        register.token
    )
    .fetch_optional(&pg)
    .await?
    .is_none()
    {
        return Err(FinishError::key());
    }

    let student_ids = sqlx::query!("SELECT id_hashed FROM students")
        .fetch_all(&pg)
        .await?
        .into_iter()
        .map(|rec| rec.id_hashed)
        .collect::<std::collections::HashSet<_>>();

    let incoming_ids = students
        .iter()
        .map(|s| s.id_hashed.clone())
        .collect::<std::collections::HashSet<_>>();

    if student_ids != incoming_ids {
        return Err(FinishError::student());
    }

    let mut tx = pg.begin().await?;

    for incoming in students {
        sqlx::query!(
            r#"
            UPDATE students
            SET id = $1, first = $2, last = $3
            WHERE id_hashed = $4
            "#,
            incoming.id,
            incoming.first,
            incoming.last,
            incoming.id_hashed
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    super::register::finish(register, pg).await?;

    Ok(())
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn token(pg: PgPool) -> Result<(), SetupKeyError> {
    let None = sqlx::query!(r#"SELECT * FROM admins LIMIT 1"#)
        .fetch_optional(&pg)
        .await?
    else {
        return Err(SetupKeyError::unauthorized());
    };

    let id = cuid2();

    sqlx::query!(
        r#"
        INSERT INTO register_sessions (id, sid_hashed, permissions)
        VALUES ($1, NULL, $2)
        "#,
        id,
        serde_json::to_value(jwt::Permissions::all())?,
    )
    .execute(&pg)
    .await?;

    println!(r#"======== SETUP TOKEN: {id} ========"#);

    Ok(())
}
