use std::borrow::Cow;

use poem_openapi::types::ToJSON;
use totp_rs::{Algorithm, TOTP};

use crate::{prelude::*, roster::hour_type::HourTypeError};

#[derive(Object)]
#[oai(rename = "SwipeRequest")]
pub(super) struct Request {
    /// AKA: admin's ID, TOTP `account_name`
    issuer: String,
    totp: String,
    sid_hashed: String,
    kind: HourType,
    #[oai(default)]
    force: bool,
    #[oai(default)]
    action: Option<SwipeAction>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enum)]
#[oai(rename_all = "snake_case")]
pub(super) enum SwipeAction {
    Login,
    Logout,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enum)]
#[oai(rename_all = "snake_case")]
pub(super) enum SwipeFallthrough {
    Denied,
    Ignored,
}

pub(super) enum Response {
    Acted(SwipeAction),
    Fallthrough(SwipeFallthrough),
}

impl poem_openapi::types::Type for Response {
    type RawElementValueType = Self;
    type RawValueType = Self;

    const IS_REQUIRED: bool = true;

    fn name() -> std::borrow::Cow<'static, str> {
        Cow::Borrowed("SwipeResponse")
    }

    fn schema_ref() -> poem_openapi::registry::MetaSchemaRef {
        poem_openapi::registry::MetaSchemaRef::Reference(Self::name().into_owned())
    }

    fn register(registry: &mut poem_openapi::registry::Registry) {
        registry.create_schema::<Self, _>(Self::name().into_owned(), |registry| {
            SwipeAction::register(registry);
            SwipeFallthrough::register(registry);
            poem_openapi::registry::MetaSchema {
                ty: "string",
                any_of: vec![SwipeAction::schema_ref(), SwipeFallthrough::schema_ref()],
                ..poem_openapi::registry::MetaSchema::ANY
            }
        });
    }

    fn as_raw_value(&self) -> Option<&Self::RawValueType> {
        Some(self)
    }

    fn raw_element_iter<'a>(
        &'a self,
    ) -> Box<dyn Iterator<Item = &'a Self::RawElementValueType> + 'a> {
        Box::new(self.as_raw_value().into_iter())
    }
}

impl ToJSON for Response {
    fn to_json(&self) -> Option<serde_json::Value> {
        match self {
            Response::Acted(action) => action.to_json(),
            Response::Fallthrough(fallthrough) => fallthrough.to_json(),
        }
    }
}

#[derive(ApiResponse, ApiError)]
#[from(PermissionDeniedError, HourTypeError)]
pub(super) enum SwipeError {
    /// The given hour type is not allowed at this time. See `/roster/allowed`.
    #[oai(status = 400)]
    #[construct(hour_type(HourType), "{source} hours are not allowed right now")]
    BadRequest(PlainText<String>),

    /// The provided TOTP is invalid
    #[oai(status = 401)]
    #[from(totp_rs::TotpUrlError, "Invalid TOTP")]
    #[construct("Invalid TOTP")]
    Unauthorized(PlainText<String>),

    #[oai(status = 403)]
    Forbidden(PlainText<String>),

    /// No student with the given ID exists
    #[oai(status = 404)]
    #[construct("Student not found")]
    NotFound(PlainText<String>),

    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(
    Request {
        issuer,
        totp,
        sid_hashed,
        kind,
        force,
        action,
    }: Request,
    pg: PgPool,
) -> Result<Response, SwipeError> {
    let Some(secret) = sqlx::query!(
        r#"
        SELECT secret FROM otps
        WHERE admin_id = $1 AND hour_type = $2
        "#,
        issuer,
        kind as HourType
    )
    .fetch_optional(&pg)
    .await?
    .map(|r| r.secret) else {
        return Err(SwipeError::unauthorized());
    };

    let verifier = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret)?;
    if !verifier.check_current(&totp).unwrap_or(false) {
        return Err(SwipeError::unauthorized());
    }

    let claims = jwt::Claims::new(issuer, jwt::Claims::EXPIRY, &pg).await?;
    claims.perms.assert(Permission::Roster)?;

    if !kind.allowed(&pg).await? {
        return Err(SwipeError::hour_type(kind));
    }

    let records = sqlx::query!(
        r#"
        SELECT id, sign_in FROM records
        WHERE sid_hashed = $1
            AND hour_type = $2
            AND sign_out IS NULL
        "#,
        sid_hashed,
        kind as HourType,
    )
    .fetch_all(&pg)
    .await?;

    let now = Local::now();

    let record = records
        .into_iter()
        .find(|r| r.sign_in.and_local().date_naive() == now.date_naive());

    if let Some(record) = record {
        if let Some(SwipeAction::Login) = action {
            return Ok(Response::Fallthrough(SwipeFallthrough::Ignored));
        }

        let dt = now - record.sign_in.and_local();

        if (dt.num_minutes() < 3) && !force {
            return Ok(Response::Fallthrough(SwipeFallthrough::Denied));
        }

        sqlx::query!(
            r#"
            UPDATE records
            SET sign_out = NOW()
            WHERE id = $1
            "#,
            record.id
        )
        .execute(&pg)
        .await?;

        tokio::spawn(async move {
            telemeter(
                StudentLogout {
                    sid_hashed,
                    record_id: record.id,
                    admin_id: claims.sub,
                },
                &pg,
            )
            .await
            .log();
        });

        return Ok(Response::Acted(SwipeAction::Logout));
    }

    if let Some(SwipeAction::Logout) = action {
        return Ok(Response::Fallthrough(SwipeFallthrough::Ignored));
    }

    let id = cuid2();
    let q = sqlx::query!(
        r#"
        INSERT INTO records (id, sid_hashed, hour_type, sign_in)
        SELECT $1, $2, $3, NOW()
        WHERE EXISTS (
            SELECT 1
            FROM students s
            WHERE s.id_hashed = $2
        )
        "#,
        id,
        sid_hashed,
        kind as HourType,
    )
    .execute(&pg)
    .await?;

    if q.rows_affected() == 0 {
        return Err(SwipeError::not_found());
    }

    tokio::spawn(async move {
        telemeter(
            StudentLogin {
                sid_hashed,
                record_id: id,
                admin_id: claims.sub,
            },
            &pg,
        )
        .await
        .log();
    });

    Ok(Response::Acted(SwipeAction::Login))
}
