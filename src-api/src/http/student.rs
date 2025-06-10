use super::roster::HourType;
use crate::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct HoursResponse {
    build: f64,
    learning: f64,
    demo: f64,
}

impl HoursResponse {
    fn type_mut(&mut self, kind: HourType) -> &mut f64 {
        match kind {
            HourType::Build => &mut self.build,
            HourType::Learning => &mut self.learning,
            HourType::Demo => &mut self.demo,
        }
    }

    fn add(&mut self, kind: HourType, amount: f64) {
        *self.type_mut(kind) += amount;
    }
}

pub async fn hours(id: String, pg: &PgPool) -> Result<HoursResponse, RouteError> {
    debug!("Fetching hours for student {id}");

    super::roster::delete_expired(pg).await?;

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

    let mut hours = HoursResponse::default();

    for record in records {
        let dt = record.sign_out - record.sign_in;
        let dt = dt.as_seconds_f64() / 60.0 / 60.0;
        hours.add(record.hour_type, dt);
    }

    Ok(hours)
}

pub async fn exists(id: String, pg: &PgPool) -> Result<bool, RouteError> {
    debug!("Checking if student {id} exists");

    let student = sqlx::query!(
        r#"
        SELECT student_id FROM records
        WHERE student_id = $1
        "#,
        id
    )
    .fetch_optional(pg)
    .await?;

    debug!("Student {id} exists: {}", student.is_some());

    Ok(student.is_some())
}
