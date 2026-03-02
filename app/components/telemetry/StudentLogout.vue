<script setup lang="ts">
import type { EventStudentLogout } from "~/utils/api";

const props = defineProps<{ event: EventStudentLogout; }>();
const creds = useCreds();
const crypto = useCrypto();
const denied = ref(false);

const student = decryptedStudent(creds, crypto, props.event.sid_hashed, denied);
const admin = await telemetryAdmin(props.event.admin_id, denied);

const fields = computed(() => [
    {
        title: "Authorized By",
        data: admin!.username,
    },
    {
        title: "Student",
        data: studentName(student.value) ?? "Unknown",
    },
]);
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data="fields" />
    </TelemetryRoot>
</template>
