<script setup lang="ts">
import type { EventStudentDelete } from "~/utils/api";

const props = defineProps<{ event: EventStudentDelete; }>();
const creds = useCreds();
const crypto = useCrypto();
const denied = ref(false);

const student = decryptFields(creds, crypto, [
    props.event.id,
    props.event.first,
    props.event.last,
]);

const admin = await telemetryAdmin(props.event.admin_id, denied);

const fields = computed(() => [
    { title: "Deleted By", data: admin!.username },
    { title: "Student ID", data: student.value[0] ?? "" },
    { title: "First Name", data: student.value[1] ?? "" },
    { title: "Last Name", data: student.value[2] ?? "" },
]);
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data="fields" />
    </TelemetryRoot>
</template>
