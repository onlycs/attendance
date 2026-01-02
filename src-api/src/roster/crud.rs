use std::collections::HashMap;

use poem_openapi::Union;

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
#[oai(rename = "RosterGetMany")]
pub(super) struct GetManyResponse {
    records: HashMap<<Record as Row>::Key, Record>,
}

#[derive(Union)]
#[oai(rename = "RosterGetResponse", discriminator_name = "quantity")]
pub(super) enum GetResponse {
    Many(GetManyResponse),
    One(Record),
}

#[derive(Object)]
#[oai(rename = "RosterCreateResponse")]
pub(super) struct CreateResponse {
    entry_id: String,
}

pub(super) type UpdateResponse = Record;
pub(super) type DeleteResponse = Record;

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub enum GetError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 404)]
    #[construct("Record not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub enum CreateError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 400)]
    #[construct(time_out, "time_out must be after and on the same day as time_in")]
    BadRequest(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError, GetError)]
pub enum UpdateError {
    #[oai(status = 400)]
    #[construct(time_out, "time_out must be after and on the same day as time_in")]
    BadRequest(PlainText<String>),

    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 404)]
    #[construct("Record not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[derive(ApiResponse, ApiError)]
#[from(JwtVerifyError, PermissionDeniedError)]
pub enum DeleteError {
    #[oai(status = 401)]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    #[oai(status = 404)]
    #[construct("Record not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn get(id: Option<String>, pg: PgPool) -> Result<GetResponse, GetError> {
    let Some(id) = id else {
        let records = Record::select_all(&pg).await?;
        return Ok(GetResponse::Many(GetManyResponse { records }));
    };

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
    .ok_or(GetError::not_found())?;

    Ok(GetResponse::One(record))
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn add(
    CreateRequest {
        sid_hashed,
        kind,
        time_in,
        time_out,
    }: CreateRequest,
    pg: PgPool,
) -> Result<CreateResponse, CreateError> {
    if let Some(to) = time_out {
        let local_in = time_in.with_timezone(&Local);
        let local_out = to.with_timezone(&Local);
        if local_out.date_naive() != local_in.date_naive() || local_out < local_in {
            return Err(CreateError::time_out());
        }
    }

    sqlx::query!(
        r#"
        INSERT INTO records (sid_hashed, hour_type, sign_in, sign_out)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
        sid_hashed,
        kind as HourType,
        time_in,
        time_out
    )
    .fetch_one(&pg)
    .await
    .map_err(CreateError::from)
    .map(|rec| CreateResponse { entry_id: rec.id })
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn update(
    UpdateRequest {
        id,
        sid_hashed,
        hour_type,
        sign_in,
        sign_out,
    }: UpdateRequest,
    pg: PgPool,
) -> Result<UpdateResponse, UpdateError> {
    'ok: {
        // if we set sign_out to null, skip all checks
        if sign_out.is_some_and(|set_to| set_to.is_none()) {
            break 'ok;
        }

        // if we don't touch them, no need to validate
        if sign_in.is_none() && sign_out.is_none() {
            break 'ok;
        }

        // here, sign_out is either None or SomeSome
        let sign_out = match sign_out.flatten() {
            Some(out) => out,
            None => {
                let Some(out) = sqlx::query!(
                    r#"
                    SELECT sign_out FROM records
                    WHERE id = $1
                    "#,
                    id,
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

        let sign_in = match sign_in {
            Some(in_time) => in_time,
            None => {
                sqlx::query!(
                    r#"
                    SELECT sign_in FROM records
                    WHERE id = $1
                    "#,
                    id,
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

    sqlx::query_as::<_, Record>(
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
    .bind(id)
    .bind(sid_hashed)
    .bind(hour_type)
    .bind(sign_in)
    .bind(sign_out)
    .fetch_optional(&pg)
    .await?
    .ok_or(UpdateError::not_found())
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn delete(
    DeleteRequest { entry_id }: DeleteRequest,
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

    Ok(record)
}
