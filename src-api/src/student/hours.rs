use crate::prelude::*;

#[derive(Object, Default)]
#[oai(rename = "StudentHoursResponse")]
pub(super) struct Response {
    build: f64,
    learning: f64,
    demo: f64,
    offseason: f64,
}

impl Response {
    fn hours_mut(&mut self, kind: HourType) -> &mut f64 {
        match kind {
            HourType::Build => &mut self.build,
            HourType::Learning => &mut self.learning,
            HourType::Demo => &mut self.demo,
            HourType::Offseason => &mut self.offseason,
        }
    }

    fn add(&mut self, kind: HourType, amount: f64) {
        *self.hours_mut(kind) += amount;
    }
}

#[derive(ApiResponse, ApiError)]
pub(super) enum Error {
    #[oai(status = 500)]
    #[from(sqlx::Error, "Database error")]
    InternalServerError(PlainText<String>),
}

#[tracing::instrument(skip(pg), err)]
pub(super) async fn route(sid_hashed: String, pg: PgPool) -> Result<Response, Error> {
    let mut res = Response::default();

    let records = sqlx::query!(
        r#"
        SELECT hour_type AS "hour_type: HourType", sign_in, sign_out
        FROM records
        WHERE sid_hashed = $1 AND sign_out IS NOT NULL
        "#,
        sid_hashed
    )
    .fetch_all(&pg)
    .await?;

    for record in records {
        let dt = record.sign_out.expect("unreachable") - record.sign_in;
        let hours = dt.num_minutes() as f64 / 60.0;
        res.add(record.hour_type, hours);
    }

    Ok(res)
}
