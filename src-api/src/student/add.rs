use crate::{dbstream::Student, prelude::*};

pub type Request = Student;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 409)]
    #[construct("Student with this ID already exists")]
    Conflict(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(incoming: Request, claims: jwt::Claims, pg: PgPool) -> Result<(), Error> {
    let affected = sqlx::query!(
        r#"
        INSERT INTO students (id_hashed, id, first, last)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id_hashed) DO NOTHING
        "#,
        incoming.id_hashed,
        incoming.id,
        incoming.first,
        incoming.last
    )
    .execute(&pg)
    .await?;

    if affected.rows_affected() == 0 {
        return Err(Error::conflict());
    }

    tokio::spawn(async move {
        telemeter(
            StudentAdd {
                admin_id: claims.sub,
                student: incoming,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(())
}
