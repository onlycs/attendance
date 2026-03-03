<script setup lang="ts">
import type { EventInviteAdd } from "~/utils/api";

const props = defineProps<{ event: EventInviteAdd }>();
const denied = ref(false);

const admin = await telemetryAdmin(props.event.admin_id, denied);
const data = [
    {
        title: "Created By",
        data: admin!.username,
    },
];
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data />
    </TelemetryRoot>
</template>
