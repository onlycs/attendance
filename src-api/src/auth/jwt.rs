use attendance_api_macro::declare_permissions;
use jsonwebtoken::{Algorithm, EncodingKey, Header, TokenData};
use poem_openapi::{SecurityScheme, auth::Bearer};

use super::prelude::*;

#[derive(ApiResponse, ApiError)]
pub(crate) enum JwtVerifyError {
    #[oai(status = 401)]
    #[construct(jwt, "Invalid or expired JWT")]
    Unauthorized(PlainText<String>),

    #[oai(status = 500)]
    InternalServerError(PlainText<String>),
}

fn header() -> Header {
    Header::new(Algorithm::HS256)
}

fn secret() -> &'static [u8] {
    // fetch the JWT secret. In devel, this is dotenv.JWT_SECRET. In prod, we're
    // using google cloud secret manager. either way, it's exposed as an env
    // var.
    env::JWT_SECRET.as_bytes()
}

fn sign(claims: &Claims) -> Result<String, jsonwebtoken::errors::Error> {
    let secret = secret();
    let token = jsonwebtoken::encode(&header(), claims, &EncodingKey::from_secret(&secret))?;

    Ok(token)
}

fn verify(jwt: &str) -> Result<Claims, JwtVerifyError> {
    let secret = secret();
    let TokenData { claims, .. } = match jsonwebtoken::decode::<Claims>(
        jwt,
        &jsonwebtoken::DecodingKey::from_secret(&secret),
        &jsonwebtoken::Validation::new(header().alg),
    ) {
        Ok(data) => data,
        Err(_) => return Err(JwtVerifyError::jwt()),
    };

    if claims.exp < Utc::now() {
        return Err(JwtVerifyError::jwt());
    }

    Ok(claims)
}

// i legitimately could not have thought of a better use of my time
declare_permissions!();

impl AsRef<Permission> for Permission {
    fn as_ref(&self) -> &Permission {
        self
    }
}

#[derive(ApiResponse, ApiError)]
pub(crate) enum PermissionDeniedError {
    #[oai(status = 403)]
    #[construct(new(Permission), "Missing permission `{source}`")]
    #[construct(new_ambiguous, "Missing required permissions")]
    Forbidden(PlainText<String>),

    #[oai(status = 500)]
    InternalServerError(PlainText<String>),
}

impl Permissions {
    pub(crate) fn assert(
        &self,
        permission: impl AsRef<Permission>,
    ) -> Result<(), PermissionDeniedError> {
        let p = *permission.as_ref();
        if !self[p] {
            return Err(PermissionDeniedError::new(p));
        }
        Ok(())
    }

    pub(crate) fn assert_all(
        &self,
        permissions: impl IntoIterator<Item = impl AsRef<Permission>>,
    ) -> Result<(), PermissionDeniedError> {
        for permission in permissions {
            self.assert(permission)?;
        }

        Ok(())
    }

    pub(crate) fn assert_any(
        &self,
        permissions: impl IntoIterator<Item = impl AsRef<Permission>>,
    ) -> Result<(), PermissionDeniedError> {
        for permission in permissions {
            if self[*permission.as_ref()] {
                return Ok(());
            }
        }

        Err(PermissionDeniedError::new_ambiguous())
    }
}

#[derive(Debug, Object, Serialize, Deserialize)]
pub(crate) struct Claims {
    pub(crate) sub: String,
    #[oai(skip)]
    #[serde(with = "chrono::serde::ts_seconds")]
    pub(crate) exp: chrono::DateTime<Utc>,
    #[oai(rename = "exp")]
    #[serde(skip)]
    __exp: i64,
    pub(crate) perms: Permissions,
    pub(crate) k1e: String,
    pub(crate) username: String,
}

impl Claims {
    pub(crate) const EXPIRY: chrono::Duration = chrono::Duration::hours(8);

    pub(crate) async fn new(
        user_id: String,
        duration: chrono::Duration,
        pg: &PgPool,
    ) -> Result<Self, sqlx::Error> {
        struct JwtRecord {
            k1e: String,
            username: String,
            p: DbPermissions,
        }

        let auth = sqlx::query_as!(
            JwtRecord,
            r#"
            SELECT a.k1e, a.username, p as "p: DbPermissions"
            FROM admins a
            JOIN permissions p ON a.id = p.user_id
            WHERE a.id = $1
            "#,
            user_id
        )
        .fetch_one(pg)
        .await?;

        let exp = Utc::now() + duration;

        Ok(Self {
            sub: user_id,
            exp,
            __exp: exp.timestamp(),
            perms: auth.p.into(),
            k1e: auth.k1e,
            username: auth.username,
        })
    }

    pub(crate) fn sign(&self) -> Result<String, jsonwebtoken::errors::Error> {
        sign(self)
    }
}

#[derive(SecurityScheme)]
#[oai(ty = "bearer")]
pub(crate) struct Jwt(Bearer);

impl Jwt {
    pub(crate) fn verify(&self) -> Result<Claims, JwtVerifyError> {
        verify(&self.0.token)
    }
}
