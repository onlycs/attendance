<script setup lang="ts">
import type { EventAdminEdit } from "~/utils/api";

const props = defineProps<{ event: EventAdminEdit }>();
const creds = useCreds();
const crypto = useCrypto();
const denied = ref(false);

const admin = await telemetryAdmin(props.event.admin_id, denied);

const fields = [
    {
        title: "Edited By",
        data: admin!.username,
    },
];

const table = computed(() => {
    return [
        {
            title: "Username",
            data: props.event.old.username,
            update: props.event.username ?? null,
        },
    ];
});
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data="fields" />
        <TelemetryTable :data="table" />
    </TelemetryRoot>
</template>
