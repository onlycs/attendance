use std::collections::HashMap;

use chrono::NaiveDateTime;
use chrono_tz::US::Eastern;

use crate::prelude::*;

struct CsvRow {
    total: f64,
    build: f64,
    learning: f64,
    dates: Vec<f64>,
}

impl CsvRow {
    fn new_learning(date: usize, total: f64) -> Self {
        let mut dates = vec![0.0; date + 1];
        dates[date] = total;

        Self {
            total,
            build: 0.0,
            learning: total,
            dates,
        }
    }

    fn new_build(date: usize, total: f64) -> Self {
        let mut dates = vec![0.0; date + 1];
        dates[date] = total;

        Self {
            total,
            build: total,
            learning: 0.0,
            dates,
        }
    }

    fn add_learning(&mut self, total: f64) {
        self.learning += total;
        self.total += total;
    }

    fn add_build(&mut self, total: f64) {
        self.build += total;
        self.total += total;
    }

    fn add_date(&mut self, index: usize, total: f64) {
        if self.dates.len() <= index {
            self.dates.resize(index + 1, 0.0);
        }

        self.dates[index] += total;
    }

    fn to_str(&self) -> String {
        let mut row = format!(
            "{:.2},{:.2},{:.2}",
            self.total / 60.0,
            self.build / 60.0,
            self.learning / 60.0
        );

        for date in &self.dates {
            row.push_str(&format!(",{:.2}", date / 60.0));
        }

        row
    }
}

pub async fn csv(pg: &PgPool) -> Result<String, RouteError> {
    sqlx::query!(
        r#"
        DELETE FROM records
        WHERE sign_in - sign_out > INTERVAL '5 hours'
        "#
    )
    .execute(pg)
    .await?;

    let learning_days = sqlx::query!(
        r#"
        SELECT student_id, sign_in, sign_out 
        FROM records
        WHERE sign_out IS NOT NULL 
            AND in_progress = false
            AND EXTRACT(MONTH FROM sign_in) <= 12
            AND EXTRACT(MONTH FROM sign_in) >= 11
        "#
    )
    .fetch_all(pg)
    .await?;

    let build_hours = sqlx::query!(
        r#"
        SELECT student_id, sign_in, sign_out FROM records
        WHERE sign_out IS NOT NULL 
            AND in_progress = false
            AND EXTRACT(MONTH FROM sign_in) <= 5
            AND EXTRACT(MONTH FROM sign_in) >= 1
        "#
    )
    .fetch_all(pg)
    .await?;

    let mut idx = 0;
    let mut header = String::from("student_id,total,build,learning");
    let mut dates = HashMap::new();
    let mut rows = HashMap::new();

    let mut add_or_get_date = |date: &NaiveDateTime| {
        let date = date
            .and_local_timezone(Eastern)
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();

        let entry = dates.get(&date);

        if let Some(idx) = entry {
            *idx
        } else {
            header.push_str(&format!(",{}", date));
            dates.insert(date, idx);
            idx += 1;

            idx - 1
        }
    };

    for learning_day in learning_days {
        let student_id = learning_day.student_id;
        let sign_in = learning_day.sign_in;
        let sign_out = learning_day.sign_out.unwrap();
        let diff = sign_out.signed_duration_since(sign_in);
        let mins = diff.num_minutes() as f64;
        let idx = add_or_get_date(&sign_in);

        rows.entry(student_id)
            .and_modify(|row: &mut CsvRow| {
                row.add_learning(mins);
                row.add_date(idx, mins);
            })
            .or_insert(CsvRow::new_learning(idx, mins));
    }

    for build_day in build_hours {
        let student_id = build_day.student_id;
        let sign_in = build_day.sign_in;
        let sign_out = build_day.sign_out.unwrap();
        let diff = sign_out.signed_duration_since(sign_in);
        let mins = diff.num_minutes() as f64;
        let idx = add_or_get_date(&sign_in);

        rows.entry(student_id)
            .and_modify(|row: &mut CsvRow| {
                row.add_build(mins);
                row.add_date(idx, mins);
            })
            .or_insert(CsvRow::new_build(idx, mins));
    }

    let csv = rows
        .into_iter()
        .map(|(id, data)| format!("{},{}\n", id, data.to_str()))
        .collect::<String>();

    Ok(format!("{}\n{}", header, csv))
}
