<script setup lang="ts">
import type { EventInviteUse } from "~/utils/api";

const props = defineProps<{ event: EventInviteUse }>();
const denied = ref(false);

const invitee = await telemetryAdmin(props.event.invitee_id, denied);
const inviter = await telemetryAdmin(props.event.invitee_id, denied);
const data = [
    {
        title: "Invited By",
        data: invitee!.username,
    },
    {
        title: "New Admin",
        data: inviter!.username,
    },
];
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data />
    </TelemetryRoot>
</template>
