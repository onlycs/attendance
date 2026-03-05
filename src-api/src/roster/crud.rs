use std::collections::HashMap;

use poem_openapi::types::MaybeUndefined;

use crate::{
    dbstream::{PartialRecord, Record, Row},
    prelude::*,
};

#[derive(Object)]
#[oai(rename = "RosterCreateRequest")]
pub(super) struct CreateRequest {
    sid_hashed: String,
    kind: HourType,
    time_in: chrono::DateTime<Utc>,
    /// Must be after and on the same day as time_in (in server's local time)
    time_out: Option<chrono::DateTime<Utc>>,
}

pub(super) type UpdateRequest = PartialRecord;

#[derive(Object)]
#[oai(rename = "RosterDeleteRequest")]
pub(super) struct DeleteRequest {
    entry_id: String,
}

#[derive(Object)]
#[oai(rename = "RosterQueryManyResponse")]
pub(super) struct QueryManyResponse {
    records: HashMap<<Record as Row>::Key, Record>,
}

pub(super) type QueryOneResponse = Record;

#[derive(Object)]
#[oai(rename = "RosterCreateResponse")]
pub(super) struct CreateResponse {
    entry_id: String,
}

pub(super) type UpdateResponse = Record;
pub(super) type DeleteResponse = Record;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum GetManyError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum GetOneError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    /// Record with the given ID does not exist
    #[oai(status = 404)]
    #[construct("Record not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum CreateError {
    /// time_out is before or on a different day than time_in
    #[oai(status = 400)]
    #[construct(time_out, "time_out must be after and on the same day as time_in")]
    BadRequest(PlainText<String>),

    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum UpdateError {
    /// time_out is before or on a different day than time_in
    #[oai(status = 400)]
    #[construct(time_out, "time_out must be after and on the same day as time_in")]
    BadRequest(PlainText<String>),

    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    /// Record with the given ID does not exist
    #[oai(status = 404)]
    #[construct("Record not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub(super) enum DeleteError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    /// Record with the given ID does not exist
    #[oai(status = 404)]
    #[construct("Record not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn query_many(pg: PgPool) -> Result<QueryManyResponse, GetManyError> {
    let records = Record::select_all(&pg).await?;
    Ok(QueryManyResponse { records })
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn query_one(id: String, pg: PgPool) -> Result<QueryOneResponse, GetOneError> {
    let record = sqlx::query_as::<_, Record>(
        r#"
        SELECT *
        FROM records
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pg)
    .await?
    .ok_or(GetOneError::not_found())?;

    Ok(record)
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn add(
    CreateRequest {
        sid_hashed,
        kind,
        time_in,
        time_out,
    }: CreateRequest,
    claims: jwt::Claims,
    pg: PgPool,
) -> Result<CreateResponse, CreateError> {
    if let Some(to) = time_out {
        let local_in = time_in.with_timezone(&Local);
        let local_out = to.with_timezone(&Local);
        if local_out.date_naive() != local_in.date_naive() || local_out < local_in {
            return Err(CreateError::time_out());
        }
    }

    let res = sqlx::query_as::<_, Record>(
        r#"
        INSERT INTO records (id, sid_hashed, hour_type, sign_in, sign_out)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(cuid2())
    .bind(sid_hashed)
    .bind(kind)
    .bind(time_in)
    .bind(time_out)
    .fetch_one(&pg)
    .await?;

    let entry_id = res.id.clone();

    tokio::spawn(async move {
        telemeter(
            RecordAdd {
                admin_id: claims.sub,
                record: res,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(CreateResponse { entry_id })
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn update(
    incoming: UpdateRequest,
    claims: jwt::Claims,
    pg: PgPool,
) -> Result<UpdateResponse, UpdateError> {
    'ok: {
        // if we set sign_out to null, skip all checks
        if let MaybeUndefined::Null = incoming.sign_out {
            break 'ok;
        }

        // if we don't touch them, no need to validate
        if incoming.sign_in.is_none()
            && let MaybeUndefined::Undefined = incoming.sign_out
        {
            break 'ok;
        }

        // here, sign_out is either Undefined or present
        let sign_out = match incoming.sign_out.value() {
            Some(out) => *out,
            None => {
                let Some(out) = sqlx::query!(
                    r#"
                    SELECT sign_out FROM records
                    WHERE id = $1
                    "#,
                    incoming.id,
                )
                .fetch_optional(&pg)
                .await?
                .ok_or(UpdateError::not_found())?
                .sign_out
                else {
                    // if sign_out is null in db and we are not updating it, skip checks
                    break 'ok;
                };

                out
            }
        };

        let sign_in = match incoming.sign_in {
            Some(in_time) => in_time,
            None => {
                sqlx::query!(
                    r#"
                    SELECT sign_in FROM records
                    WHERE id = $1
                    "#,
                    incoming.id,
                )
                .fetch_optional(&pg)
                .await?
                .ok_or(UpdateError::not_found())?
                .sign_in
            }
        };

        let local_in = sign_in.with_timezone(&Local);
        let local_out = sign_out.with_timezone(&Local);

        if local_out.date_naive() != local_in.date_naive() || local_out < local_in {
            return Err(UpdateError::time_out());
        }
    };

    let old = sqlx::query_as::<_, Record>(
        r#"
        SELECT *
        FROM records
        WHERE id = $1
        "#,
    )
    .bind(&incoming.id)
    .fetch_optional(&pg)
    .await?
    .ok_or(UpdateError::not_found())?;

    let new = sqlx::query_as::<_, Record>(
        r#"
        UPDATE records
        SET
            sid_hashed = COALESCE($2, sid_hashed),
            hour_type = COALESCE($3, hour_type),
            sign_in = COALESCE($4, sign_in),
            sign_out = COALESCE($5, sign_out)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(&incoming.id)
    .bind(&incoming.sid_hashed)
    .bind(incoming.hour_type)
    .bind(incoming.sign_in)
    .bind(incoming.sign_out.value())
    .fetch_one(&pg) // checked for existence above
    .await?;

    tokio::spawn(async move {
        telemeter(
            RecordEdit {
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
pub(super) async fn delete(
    DeleteRequest { entry_id }: DeleteRequest,
    claims: jwt::Claims,
    pg: PgPool,
) -> Result<DeleteResponse, DeleteError> {
    let record = sqlx::query_as::<_, Record>(
        r#"
        DELETE FROM records
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(entry_id)
    .fetch_optional(&pg)
    .await?
    .ok_or(DeleteError::not_found())?;

    let record_telemeter = record.clone();
    tokio::spawn(async move {
        telemeter(
            RecordDelete {
                admin_id: claims.sub,
                record: record_telemeter,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(record)
}
