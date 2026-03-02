<script setup lang="ts">
import type { EventStudentLogin } from "~/utils/api";
import api, { type Student } from "~/utils/api";

const props = defineProps<{ event: EventStudentLogin; }>();
const denied = ref(false);
const creds = useCreds();
const crypto = useCrypto();

const admin = await api.admin.query.one({
    path: { id: props.event.admin_id },
});

if (!admin.data) denied.value = true;

const student = ref<Student | null>(null);

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

        <template v-else>
            <div class="content">
                <span class="title">Authorized By</span>
                <span class="value">{{ admin.data?.username }}</span>
                <span class="title">Student</span>
                <span class="value" v-if="student">
                    {{ student.first }} {{ student.last }}
                </span>
                <span class="value" v-else>
                    Unknown Student
                </span>
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
