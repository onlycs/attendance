<script setup lang="ts">
import type { EventAdminLogin } from "~/utils/api";

const props = defineProps<{ event: EventAdminLogin; }>();
const denied = ref(false);

const admin = await telemetryAdmin(props.event.id, denied);
const data = [
    {
        title: "Admin",
        data: admin!.username,
    },
];
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data />
    </TelemetryRoot>
</template>
