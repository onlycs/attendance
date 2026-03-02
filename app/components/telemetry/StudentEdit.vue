<script setup lang="ts">
import type { EventStudentEdit } from "~/utils/api";
import api from "~/utils/api";

const props = defineProps<{ event: EventStudentEdit; }>();
const denied = ref(false);
const creds = useCreds();
const crypto = useCrypto();

const admin = await api.admin.query.one({
    path: { id: props.event.admin_id },
});

if (!admin.data) denied.value = true;

const id1 = ref("");
const first1 = ref("");
const last1 = ref("");

const id2 = ref<string | undefined>(undefined);
const first2 = ref<string | undefined>(undefined);
const last2 = ref<string | undefined>(undefined);

watch(creds, async (creds) => {
    if (!creds) return;

    const decrypted1 = await crypto.decrypt(
        [props.event.old.id, props.event.old.first, props.event.old.last],
        hex.asbytes(creds.k1),
    );

    if (decrypted1) {
        id1.value = decrypted1[0];
        first1.value = decrypted1[1];
        last1.value = decrypted1[2];
    }

    const decrypted2 = await crypto.decrypt(
        [
            props.event.id ?? props.event.old.id,
            props.event.first ?? props.event.old.first,
            props.event.last ?? props.event.old.last,
        ],
        hex.asbytes(creds.k1),
    );

    if (decrypted2) {
        if (props.event.id) id2.value = decrypted2[0];
        if (props.event.first) first2.value = decrypted2[1];
        if (props.event.last) last2.value = decrypted2[2];
    }
}, { immediate: true });
</script>

<template>
    <div class="data">
        <HiddenText v-if="denied || !admin" icon="hugeicons:information-circle">
            You don't have permission to view this event.
        </HiddenText>

        <template v-else>
            <div class="content">
                <span class="title">Edited By</span>
                <span class="value">{{ admin.data?.username }}</span>
            </div>

            <div class="edited mt-4">
                <span class="title nr !rounded-tl-md !bg-card-2">Field</span>
                <span class="title nr">Old</span>
                <span class="title nr !rounded-tr-md">Changed To</span>
                <span class="title nr">Student ID</span>
                <span class="value nr">{{ id1 }}</span>
                <span class="value nr">{{ id2 ?? "N/A" }}</span>
                <span class="title nr !rounded-bl-md">First Name</span>
                <span class="value nr">{{ first1 }}</span>
                <span class="value nr">{{ first2 ?? "N/A" }}</span>
                <span class="title nr !rounded-bl-md">Last Name</span>
                <span class="value nr">{{ last1 }}</span>
                <span class="value nr">{{ last2 ?? "N/A" }}</span>
            </div>
        </template>
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
