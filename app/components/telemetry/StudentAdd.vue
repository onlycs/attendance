<script setup lang="ts">
import type { EventStudentAdd } from "~/utils/api";

const props = defineProps<{ event: EventStudentAdd }>();
const creds = useCreds();
const crypto = useCrypto();
const denied = ref(false);

const student = decryptedStudent(creds, crypto, props.event.id_hashed, denied);
const admin = await telemetryAdmin(props.event.admin_id, denied);

const fields = computed(() => [
    { title: "Added By", data: admin!.username },
    { title: "Student ID", data: student.value?.id ?? "" },
    { title: "First Name", data: student.value?.first ?? "" },
    { title: "Last Name", data: student.value?.last ?? "" },
]);
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data="fields" />
    </TelemetryRoot>
</template>
