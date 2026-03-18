use crate::{
    dbstream::{Admin, PartialAdmin},
    prelude::*,
};

pub(super) type UpdateRequest = PartialAdmin;

pub(super) type UpdateResponse = Admin;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum UpdateError {
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

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum PermissionUpdateError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    #[construct(disallow_self, "Admins cannot change their own permissions")]
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
    incoming: UpdateRequest,
    claims: jwt::Claims,
    pg: PgPool,
) -> Result<UpdateResponse, UpdateError> {
    let old = sqlx::query_as::<_, Admin>(
        r#"
        SELECT *
        FROM admins
        WHERE id = $1
        "#,
    )
    .bind(&incoming.id)
    .fetch_optional(&pg)
    .await?
    .ok_or(UpdateError::not_found())?;

    let new = sqlx::query_as::<_, Admin>(
        r#"
        UPDATE admins
        SET username = COALESCE($2, username)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(&incoming.id)
    .bind(&incoming.username)
    .fetch_one(&pg) // checked for existence above
    .await?;

    tokio::spawn(async move {
        telemeter(
            AdminEdit {
                admin_id: claims.sub,
                old,
                updated: incoming,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(new)
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn update_permissions(
    id: String,
    perms: jwt::Permissions,
    claims: jwt::Claims,
    pg: PgPool,
) -> Result<(), PermissionUpdateError> {
    let old = jwt::Permissions::fetch(&id, &pg)
        .await?
        .ok_or(PermissionUpdateError::not_found())?;

    perms.update(&id, &pg).await?;

    tokio::spawn(async move {
        telemeter(
            PermissionEdit {
                admin_id: claims.sub,
                target_id: id,
                old,
                new: perms,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(())
}
