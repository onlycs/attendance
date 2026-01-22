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
pub(super) async fn route(incoming: Request, claims: jwt::Claims, pg: PgPool) -> Result<(), Error> {
    sqlx::query!(
        r#"
        INSERT INTO students (id_hashed, id, first, last)
        VALUES ($1, $2, $3, $4)
        "#,
        incoming.id_hashed,
        incoming.id,
        incoming.first,
        incoming.last
    )
    .execute(&pg)
    .await?;

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
