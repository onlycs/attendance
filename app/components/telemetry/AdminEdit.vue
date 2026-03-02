E<script setup lang="ts">
import type { EventAdminEdit, Student } from "~/utils/api";
import api from "~/utils/api";

const props = defineProps<{ event: EventAdminEdit; }>();
const denied = ref(false);
const crypto = useCrypto();
const creds = useCreds();

const admin = await api.admin.query.one({
    path: { id: props.event.admin_id },
});

if (!admin.data) denied.value = true;

let oldStudent = ref<Student | null>(null);
let newStudent = ref<Student | null>(null);

watch(creds, async (creds) => {
    if (!creds) return;

    if (props.event.old.sid_hashed) {
        const res = await api.student.query({
            path: { id_hashed: props.event.old.sid_hashed },
        });

        if (!res.data) denied.value = true;
        else oldStudent.value = res.data;

        if (oldStudent) {
            const decrypted = await crypto.decrypt(
                [oldStudent.value!.first, oldStudent.value!.last],
                hex.asbytes(creds.k1),
            );

            if (decrypted) {
                oldStudent.value!.first = decrypted[0];
                oldStudent.value!.last = decrypted[1];
            }
        }
    }

    if (props.event.sid_hashed) {
        const res = await api.student.query({
            path: { id_hashed: props.event.sid_hashed },
        });

        if (!res.data) denied.value = true;
        else newStudent.value = res.data;

        if (newStudent) {
            const decrypted = await crypto.decrypt(
                [newStudent.value!.first, newStudent.value!.last],
                hex.asbytes(creds.k1),
            );

            if (decrypted) {
                newStudent.value!.first = decrypted[0];
                newStudent.value!.last = decrypted[1];
            }
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
                <span class="title">Edited By</span>
                <span class="value">{{ admin.data?.username }}</span>
            </div>

            <div class="edited mt-4">
                <span class="title nr !rounded-tl-md !bg-card-2">Field</span>
                <span class="title nr">Old</span>
                <span class="title nr !rounded-tr-md">Changed To</span>
                <span class="title nr">Username</span>
                <span class="value nr">{{ props.event.old.username }}</span>
                <span class="value nr">{{
                    props.event.username || "N/A"
                }}</span>
                <span class="title nr !rounded-bl-md">Student</span>
                <span class="value nr">
                    {{
                        oldStudent
                        ? `${oldStudent.first} ${oldStudent.last}`
                        : "N/A"
                    }}
                </span>
                <span class="value nr !rounded-br-md">
                    {{
                        props.event.sid_hashed === null
                        ? "Removed"
                        : (newStudent
                            ? `${newStudent.first} ${newStudent.last}`
                            : "N/A")
                    }}
                </span>
            </div>
        </template>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.data {
    @apply w-full;
    @apply flex flex-col items-center justify-center;
}

.content {
    @apply grid w-full h-full;
    @apply grid-cols-2;
    @apply select-none;
    row-gap: 1rem;
}

.edited {
    @apply grid w-full h-full;
    @apply grid-cols-3;
    @apply select-none;
}

.title, .value {
    @apply flex justify-center items-center;
}

.title {
    @apply bg-white/9 h-14 w-full rounded-l-md;

    &.nr {
        @apply rounded-none;
    }
}

.value {
    @apply bg-white/3 h-14 w-full rounded-r-md px-8 text-nowrap;

    &.nr {
        @apply rounded-none;
    }
}
</style>
