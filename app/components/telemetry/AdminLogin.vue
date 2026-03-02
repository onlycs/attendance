<script setup lang="ts">
import type { EventAdminLogin } from "~/utils/api";
import api from "~/utils/api";

const props = defineProps<{ event: EventAdminLogin; }>();
const denied = ref(false);

const admin = await api.admin.query.one({
    path: { id: props.event.id },
});

if (!admin.data) denied.value = true;
</script>

<template>
    <div class="data">
        <HiddenText v-if="denied || !admin" icon="hugeicons:information-circle">
            You don't have permission to view this event.
        </HiddenText>

        <div class="content" v-else>
            <span class="title">Username</span>
            <span class="value">{{ admin.data?.username }}</span>
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.data {
    @apply w-full;
    @apply flex items-center justify-center;
}

.content {
    @apply grid w-full h-full;
    @apply grid-cols-2;
    @apply select-none;
    row-gap: 1rem;
}

.title, .value {
    @apply flex justify-center items-center;
}

.title {
    @apply bg-white/9 h-14 w-full rounded-l-md;
}

.value {
    @apply bg-white/3 h-14 w-full rounded-r-md;
}
</style>
