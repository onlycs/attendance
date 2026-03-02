<script setup lang="ts">
import type { EventStudentEdit } from "~/utils/api";

const props = defineProps<{ event: EventStudentEdit; }>();
const creds = useCreds();
const crypto = useCrypto();
const denied = ref(false);

const oldFields = decryptFields(creds, crypto, [
    props.event.old.id,
    props.event.old.first,
    props.event.old.last,
]);

const newFields = decryptFields(creds, crypto, [
    props.event.id ?? props.event.old.id,
    props.event.first ?? props.event.old.first,
    props.event.last ?? props.event.old.last,
]);

const admin = await telemetryAdmin(props.event.admin_id, denied);

const fields = [{
    title: "Edited By",
    data: admin!.username,
}];

const table = computed(() => [
    {
        title: "Student ID",
        data: oldFields.value[0] ?? "",
        update: props.event.id ? (newFields.value[0] ?? "") : null,
    },
    {
        title: "First Name",
        data: oldFields.value[1] ?? "",
        update: props.event.first ? (newFields.value[1] ?? "") : null,
    },
    {
        title: "Last Name",
        data: oldFields.value[2] ?? "",
        update: props.event.last ? (newFields.value[2] ?? "") : null,
    },
]);
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data="fields" />
        <TelemetryTable :data="table" />
    </TelemetryRoot>
</template>
