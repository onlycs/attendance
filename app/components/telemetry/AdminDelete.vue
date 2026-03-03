<script setup lang="ts">
import type { EventAdminDelete } from "~/utils/api";

const props = defineProps<{ event: EventAdminDelete }>();
const denied = ref(false);

const admin = await telemetryAdmin(props.event.admin_id, denied);
const data = [
    {
        title: "Deleted By",
        data: admin!.username,
    },
    {
        title: "Deleted User",
        data: props.event.target.username,
    },
];
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data />
    </TelemetryRoot>
</template>
