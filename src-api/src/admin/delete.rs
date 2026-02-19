use crate::{dbstream::Admin, prelude::*};

#[derive(Object)]
#[oai(rename = "AdminDeleteRequest")]
pub(super) struct Request {
    admin_id: String,
}

pub(super) type Response = Admin;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum Error {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    /// Admin with the given ID does not exist
    #[oai(status = 404)]
    #[construct("Admin not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(
    Request { admin_id }: Request,
    claims: jwt::Claims,
    pg: PgPool,
) -> Result<Response, Error> {
    let admin = sqlx::query_as::<_, Admin>(
        r#"
        DELETE FROM admins
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(admin_id)
    .fetch_optional(&pg)
    .await?
    .ok_or(Error::not_found())?;

    let admin_telemeter = admin.clone();
    tokio::spawn(async move {
        telemeter(
            AdminDelete {
                admin_id: claims.sub,
                target: admin_telemeter,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(admin)
}
