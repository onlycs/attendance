use utoipa::ToSchema;

use super::roster::HourType;
use crate::prelude::*;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct Hours {
    build: f64,
    learning: f64,
    demo: f64,
    offseason: f64,
}

impl Hours {
    fn type_mut(&mut self, kind: HourType) -> &mut f64 {
        match kind {
            HourType::Build => &mut self.build,
            HourType::Learning => &mut self.learning,
            HourType::Demo => &mut self.demo,
            HourType::Offseason => &mut self.offseason,
        }
    }

    fn add(&mut self, kind: HourType, amount: f64) {
        *self.type_mut(kind) += amount;
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct StudentData {
    pub id: String,
    pub first: String,
    pub last: String,
    pub hashed: String,
}

#[tracing::instrument(
    name = "student::info",
    skip(pg),
    fields(id = %&id[..7]),
    ret,
    err
)]
pub(super) async fn info(id: String, pg: &PgPool) -> Result<Hours, RouteError> {
    if sqlx::query!(
        r#"
        SELECT hashed FROM student_data
        WHERE hashed = $1
        "#,
        id
    )
    .fetch_optional(pg)
    .await?
    .is_none()
    {
        return Err(RouteError::StudentNotFound);
    }

    let records = sqlx::query!(
        r#"
        SELECT sign_in, sign_out as "sign_out!", hour_type as "hour_type: HourType"
        FROM records
        WHERE student_id = $1
            AND sign_out IS NOT NULL
            AND in_progress = false
        "#,
        id
    )
    .fetch_all(pg)
    .await?;

    let mut hours = Hours::default();

    for record in records {
        let dt = record.sign_out - record.sign_in;
        let dt = dt.as_seconds_f64() / 60.0 / 60.0;
        hours.add(record.hour_type, dt);
    }

    tracing::Span::current().record("build", hours.build);
    tracing::Span::current().record("learning", hours.learning);
    tracing::Span::current().record("demo", hours.demo);
    tracing::Span::current().record("offseason", hours.offseason);

    Ok(hours)
}

#[tracing::instrument(name = "student::add", skip(id, first, last, pg), ret, err)]
pub(super) async fn add(
    StudentData {
        id,
        first,
        last,
        hashed,
    }: StudentData,
    pg: &PgPool,
) -> Result<(), RouteError> {
    sqlx::query!(
        r#"
        INSERT INTO student_data (id, first, last, hashed)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (hashed) DO NOTHING
        "#,
        id,
        first,
        last,
        hashed
    )
    .execute(pg)
    .await?;

    Ok(())
}
