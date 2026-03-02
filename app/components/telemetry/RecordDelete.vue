<script setup lang="ts">
import type { EventRecordDelete, Student } from "~/utils/api";
import api from "~/utils/api";

const props = defineProps<{ event: EventRecordDelete; }>();
const denied = ref(false);
const creds = useCreds();
const crypto = useCrypto();

const admin = await api.admin.query.one({
    path: { id: props.event.admin_id },
});

if (!admin.data) denied.value = true;

let student = ref<Student | null>(null);

watch(creds, async (creds) => {
    if (!creds) return;

    const res = await api.student.query({
        path: { id_hashed: props.event.sid_hashed },
    });

    student.value = res.data ?? null;

    if (student.value) {
        const decrypted = await crypto.decrypt(
            [student.value.first, student.value.last],
            hex.asbytes(creds.k1),
        );

        if (decrypted) {
            student.value.first = decrypted[0];
            student.value.last = decrypted[1];
        }
    }
}, { immediate: true });
</script>

<template>
    <div class="data">
        <HiddenText v-if="denied || !admin" icon="hugeicons:information-circle">
            You don't have permission to view this event.
        </HiddenText>

        <div class="content" v-else>
            <span class="title">Removed By</span>
            <span class="value">{{ admin.data?.username }}</span>
            <span class="title">Hour Type</span>
            <span class="value">{{ props.event.hour_type }}</span>
            <span class="title">Student</span>
            <span class="value">
                {{
                    student
                    ? `${student.first} ${student.last}`
                    : "Unknown Student"
                }}
            </span>
            <span class="title">Time In</span>
            <span class="value">
                {{
                    api.datetime.parse(props.event.sign_in)
                    .toLocaleString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                    })
                }}
            </span>
            <span class="title">Time Out</span>
            <span class="value">
                {{
                    props.event.sign_out
                    ? api.datetime.parse(
                        props.event.sign_out,
                    ).toLocaleString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                    })
                    : "N/A"
                }}
            </span>
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
