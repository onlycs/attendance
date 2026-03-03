<script setup lang="ts">
import type { EventPermissionEdit, Permissions } from "~/utils/api";
import { PermissionTitles } from "~/utils/api";

const { event } = defineProps<{ event: EventPermissionEdit }>();
const denied = ref(false);

const admin = await telemetryAdmin(event.admin_id, denied);
const target = await telemetryAdmin(event.target_id, denied);

const fields = [
    {
        title: "Edited By",
        data: admin!.username,
    },
    {
        title: "Edited For",
        data: target!.username,
    },
];

const keys = Object.keys(event.old) as (keyof Permissions)[];
const table = keys.map((perm) => ({
    title: PermissionTitles[perm],
    data: event.old[perm],
    update: event.new[perm],
}));
</script>

<template>
    <TelemetryRoot :denied>
        <TelemetryFields :data="fields" />
        <TelemetryTable :data="table" />
    </TelemetryRoot>
</template>
