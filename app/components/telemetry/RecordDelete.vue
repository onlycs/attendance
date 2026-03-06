<script setup lang="ts">
import { type EventRecordDelete, HourTypeLabels } from "~/utils/api";

const props = defineProps<{ event: EventRecordDelete }>();
const creds = useCreds();
const crypto = useCrypto();
const denied = ref(false);

const student = decryptedStudent(creds, crypto, props.event.sid_hashed, denied);
const admin = await telemetryAdmin(props.event.admin_id, denied);

const fields = computed(() => [
    { title: "Removed By", data: admin!.username },
    { title: "Hour Type", data: HourTypeLabels[props.event.hour_type] },
    { title: "Student", data: studentName(student.value) ?? "Unknown" },
    { title: "Time In", data: datefmt(props.event.sign_in)! },
    { title: "Time Out", data: datefmt(props.event.sign_out) ?? "N/A" },
]);
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data="fields" />
    </TelemetryRoot>
</template>
