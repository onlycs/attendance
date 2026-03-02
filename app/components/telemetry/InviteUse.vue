<script setup lang="ts">
import type { EventInviteUse } from "~/utils/api";
import api from "~/utils/api";

const props = defineProps<{ event: EventInviteUse; }>();
const denied = ref(false);

const inviter = await api.admin.query.one({
    path: { id: props.event.inviter_id },
});

if (!inviter.data) denied.value = true;

const invitee = await api.admin.query.one({
    path: { id: props.event.invitee_id },
});

if (!invitee.data) denied.value = true;
</script>
<template>
    <div class="data">
        <HiddenText
            v-if="denied || !inviter || !invitee"
            icon="hugeicons:information-circle"
        >
            You don't have permission to view this event.
        </HiddenText>

        <div class="content" v-else>
            <span class="title">Created By</span>
            <span class="value">{{ inviter.data?.username }}</span>
            <span class="title">Used By</span>
            <span class="value">{{ invitee.data?.username }}</span>
        </div>
    </div>
</template>
