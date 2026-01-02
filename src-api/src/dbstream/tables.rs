use std::sync::LazyLock;

use attendance_api_macro::declare_replication;

use super::types::*;
use crate::{prelude::*, telemetry::TelemetryEvent};

declare_replication!("students");
declare_replication!("records");

/// Dummy: we're never going to send/recieve update/deletes for telemetry, it's
/// constant!
#[derive(Clone, Serialize, Deserialize, Object)]
pub(crate) struct PartialTelemetryEvent {}

impl ApplyTo<TelemetryEvent> for PartialTelemetryEvent {
    fn apply(self, _row: &mut TelemetryEvent) {}
}

impl Identifiable<String> for PartialTelemetryEvent {
    /// Let's hope beyond hope that this function never gets optimized away
    fn pkey(&self) -> &String {
        static _S: LazyLock<String> = LazyLock::new(String::new);
        &*_S
    }
}

impl Identifiable<String> for TelemetryEvent {
    fn pkey(&self) -> &String {
        &self.id
    }
}

impl Row for TelemetryEvent {
    type Key = String;
    type Partial = PartialTelemetryEvent;

    const NAME: &'static str = "telemetry";
}
