<script setup lang="ts">
import type { EventTypeFilter } from "~/utils/api";
import { f } from "~/utils/form";
import type { FormControl } from "../ui/form/Form.vue";

const props = defineProps<{
    update: (f: EventTypeFilter | undefined) => Promise<void>;
}>();

const { admins } = useAdminData();
const { students } = useStudentData();

const usernames = adminUsernames(admins);
const names = studentNames(students);
const dirty = ref(false);
const loading = ref(false);

const form = computed(() => {
    return f.form({
        items: {
            event: f.select({
                all: "All Events",
                ...EventTypeDisplay,
            }, {
                title: "Event Type",
                rows: 5,
                "class:container": "ftype",
            }),
            admin_id: f.combobox(
                usernames.value,
                {
                    title: "Authorized By",
                    placeholder: "Filter by admin...",
                },
            ).many(),
            target_id: f.combobox(
                usernames.value,
                {
                    title: "Target User",
                    placeholder: "Filter by admin...",
                },
            ).many(),
            inviter_id: f.combobox(
                usernames.value,
                {
                    title: "Inviteed By",
                    placeholder: "Filter by admin...",
                },
            ).many(),
            invitee_id: f.combobox(
                usernames.value,
                {
                    title: "Invited User",
                    placeholder: "Filter by admin...",
                },
            ).many(),
            sid_hashed: f.combobox(
                names.value,
                {
                    title: "Student",
                    placeholder: "Filter by student...",
                },
            ).many(),
        },
        deps: {
            admin_id: {
                event: f.permit(
                    "admin_delete",
                    "admin_edit",
                    "admin_login",
                    "invite_add",
                    "permission_edit",
                    "record_add",
                    "record_delete",
                    "record_edit",
                    "student_add",
                    "student_delete",
                    "student_edit",
                    "student_login",
                    "student_logout",
                ),
            },
            target_id: {
                event: f.permit(
                    "admin_delete",
                    "admin_edit",
                    "permission_edit",
                ),
            },
            inviter_id: {
                event: "invite_use",
            },
            invitee_id: {
                event: "invite_use",
            },
            sid_hashed: {
                event: f.permit("student_login", "student_logout"),
            },
        },
        defaults: {
            event: "all",
        },

        async submit(output: EventTypeFilter | { event: "all"; }) {
            await props.update(output.event === "all" ? undefined : output);
        },
    });
});

const control = ref<FormControl<typeof form["value"]>>(null!);
</script>
<template>
    <WidgetRoot :required="['telemetry', 'admin_view', 'student_view']">
        <div :class="cn('filter', loading && 'loading')">
            <Form
                ref="control"
                v-model:dirty="dirty"
                v-model:loading="loading"
                :form
            />

            <Button
                kind="primary"
                class="submit !p-1"
                class:content="gap-2 text-sm"
                v-if="dirty && !loading"
                @click="control.submit()"
            >
                <Icon name="hugeicons:tick-02" size="24" />
            </Button>
        </div>
    </WidgetRoot>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.filter {
    @apply relative;
    @apply bg-drop p-4 rounded-lg;
    @apply w-full h-[41.125rem];
    @apply overflow-y-scroll;
}

.filter:not(.loading) {
    @apply grid;

    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
}

.filter.loading {
    @apply flex items-center justify-center;
}

.filter :deep(.ftype) {
    @apply col-span-2;
}

.filter:has(> :nth-child(2)) > :deep(.ftype) {
    @apply mb-4.5;
}

.filter:not(:has(> :nth-child(3))) > :nth-child(2) {
    @apply col-span-2;
}

.submit {
    @apply absolute top-2 right-2;
    @apply h-fit w-fit;
}
</style>
