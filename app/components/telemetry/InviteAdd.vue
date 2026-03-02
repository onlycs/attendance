<script setup lang="ts">
import type { EventInviteAdd } from "~/utils/api";
import api from "~/utils/api";

const props = defineProps<{ event: EventInviteAdd; }>();
const denied = ref(false);

const admin = await api.admin.query.one({
    path: { id: props.event.admin_id },
});

if (!admin.data) denied.value = true;
</script>
<template>
    <div class="data">
        <HiddenText v-if="denied || !admin" icon="hugeicons:information-circle">
            You don't have permission to view this event.
        </HiddenText>

        <div class="content" v-else>
            <span class="title">Created By</span>
            <span class="value">{{ admin.data?.username }}</span>
        </div>
    </div>
</template>
