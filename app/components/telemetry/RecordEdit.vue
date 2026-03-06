<script setup lang="ts">
import { HourTypeLabels, type RecordEdit } from "~/utils/api";

const { event } = defineProps<{ event: RecordEdit }>();
const creds = useCreds();
const crypto = useCrypto();
const denied = ref(false);

const oldStudent = decryptedStudent(
    creds,
    crypto,
    event.old.sid_hashed,
    denied,
);

const newStudent = decryptedStudent(creds, crypto, event.sid_hashed, denied);

const admin = await telemetryAdmin(event.admin_id, denied);

const fields = [
    {
        title: "Edited By",
        data: admin!.username,
    },
];

const table = computed(() => [
    {
        title: "Hour Type",
        data: HourTypeLabels[event.old.hour_type],
        update: event.hour_type ?? null,
    },
    {
        title: "Student",
        data: studentName(oldStudent.value) ?? "Unknown",
        update:
            event.sid_hashed !== undefined
                ? studentName(newStudent.value)
                : null,
    },
    {
        title: "Time In",
        data: datefmt(event.old.sign_in)!,
        update: datefmt(event.sign_in) ?? null,
    },
    {
        title: "Time Out",
        data: datefmt(event.old.sign_out) ?? "None",
        update:
            event.sign_out === null
                ? "None"
                : (datefmt(event.sign_out) ?? null),
    },
]);
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data="fields" />
        <TelemetryTable :data="table" />
    </TelemetryRoot>
</template>
