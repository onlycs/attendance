<script setup lang="ts">
import type { Event } from "~/utils/api";
const { event } = defineProps<{ event: Event; }>();
</script>

<template>
    <TelemetryAdminDelete v-if="event.event === 'admin_delete'" :event />
    <TelemetryAdminEdit v-else-if="event.event === 'admin_edit'" :event />
    <TelemetryAdminLogin v-else-if="event.event === 'admin_login'" :event />
    <TelemetryInviteAdd v-else-if="event.event === 'invite_add'" :event />
    <TelemetryInviteUse v-else-if="event.event === 'invite_use'" :event />
    <TelemetryPermsEdit v-else-if="event.event === 'permission_edit'" :event />
    <TelemetryRecordAdd v-else-if="event.event === 'record_add'" :event />
    <TelemetryRecordEdit v-else-if="event.event === 'record_edit'" :event />
    <TelemetryRecordDelete v-else-if="event.event === 'record_delete'" :event />
    <TelemetryStudentAdd v-else-if="event.event === 'student_add'" :event />
    <TelemetryStudentEdit v-else-if="event.event === 'student_edit'" :event />
    <TelemetryStudentDelete
        v-else-if="event.event === 'student_delete'"
        :event
    />
    <TelemetryStudentLogin v-else-if="event.event === 'student_login'" :event />
    <TelemetryStudentLogout
        v-else-if="event.event === 'student_logout'"
        :event
    />
</template>
