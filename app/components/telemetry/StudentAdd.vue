<script setup lang="ts">
import type { EventStudentAdd } from "~/utils/api";
import api from "~/utils/api";

const props = defineProps<{ event: EventStudentAdd; }>();
const denied = ref(false);
const creds = useCreds();
const crypto = useCrypto();

const admin = await api.admin.query.one({
    path: { id: props.event.admin_id },
});

if (!admin.data) denied.value = true;

const id = ref("");
const first = ref("");
const last = ref("");

watch(creds, async (creds) => {
    if (!creds) return;

    const decrypted = await crypto.decrypt(
        [props.event.id, props.event.first, props.event.last],
        hex.asbytes(creds.k1),
    );

    if (decrypted) {
        id.value = decrypted[0];
        first.value = decrypted[1];
        last.value = decrypted[2];
    }
}, { immediate: true });
</script>

<template>
    <div class="data">
        <HiddenText v-if="denied || !admin" icon="hugeicons:information-circle">
            You don't have permission to view this event.
        </HiddenText>

        <div class="content" v-else>
            <span class="title">Added By</span>
            <span class="value">{{ admin.data?.username }}</span>
            <span class="title">Student ID</span>
            <span class="value">{{ id }}</span>
            <span class="title">First Name</span>
            <span class="value">{{ first }}</span>
            <span class="title">Last Name</span>
            <span class="value">{{ last }}</span>
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
