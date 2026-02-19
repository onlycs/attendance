<script setup lang="ts">
import { AgGridVue } from "ag-grid-vue3";
import type { EventTypeFilter } from "~/utils/api";

const { admins } = useAdminData();
const { students } = useStudentData();

const usernames = adminUsernames(admins);
const names = studentNames(students);

const form = computed(() => {
    return f.form(
        {
            type: f.select({
                schema: {
                    all: "All Events",
                    invite_add: "New Invite",
                    invite_use: "Invite Used",
                    student_login: "Student Login",
                    student_logout: "Student Logout",
                    admin_login: "Admin Login",
                    permission_edit: "Permissions",
                    admin_edit: "Admin Edited",
                    admin_delete: "Admin Removed",
                    record_add: "New Record",
                    record_edit: "Record Edited",
                    record_delete: "Record Removed",
                    student_add: "New Student",
                    student_edit: "Student Edited",
                    student_delete: "Student Removed",
                },
                default: "student_login",
                title: "Event Type",
                rows: 5,
                "class:container": "ftype",
            }),
            admin_id: f.many({
                title: "Authorized By",
                inner: f.combobox({
                    schema: usernames.value,
                    placeholder: "Filter by admin...",
                }),
            }),
            target_id: f.many({
                title: "Target Admin",
                inner: f.combobox({
                    schema: usernames.value,
                    placeholder: "Filter by target admin...",
                }),
            }),
            inviter_id: f.many({
                title: "Invited By",
                inner: f.combobox({
                    schema: usernames.value,
                    placeholder: "Filter by inviter...",
                }),
            }),
            invitee_id: f.many({
                title: "Invited User",
                inner: f.combobox({
                    schema: usernames.value,
                    placeholder: "Filter by invitee...",
                }),
            }),
            sid_hashed: f.many({
                title: "Student",
                inner: f.combobox({
                    schema: names.value,
                    placeholder: "Filter by student...",
                }),
            }),
        },
        [],
        {
            deps: {
                admin_id: {
                    type: f.permit(
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
                    type: f.permit(
                        "admin_delete",
                        "admin_edit",
                        "permission_edit",
                    ),
                },
                inviter_id: {
                    type: "invite_use",
                },
                invitee_id: {
                    type: "invite_use",
                },
                sid_hashed: {
                    type: f.permit("student_login", "student_logout"),
                },
            },

            async submit(output: EventTypeFilter | { type: "all"; }) {
            },
        },
    );
});

definePageMeta({ layout: "admin-protected" });
</script>

<template>
    <RequireWidth :width="1032" class="page">
        <WidgetRoot
            :required="['telemetry', 'admin_view', 'student_view']"
            class="filter-box"
        >
            <div class="filter">
                <Form
                    :form="form.form"
                    :deps="form.deps"
                    :buttons="unref(form.buttons)"
                    @submit="form.submit"
                />
            </div>
        </WidgetRoot>

        <WidgetQuickSwipe />
        <WidgetTotals />

        <WidgetRoot :required="['telemetry']" class="table">
            <AgGridVue
                style="width: 100%; height: 100%"
                :theme="Theme"
            />
        </WidgetRoot>
    </RequireWidth>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply w-full h-full;
    @apply grid gap-2;

    grid-template-rows: auto auto 1fr;
    grid-template-columns: 1fr auto;
}

:deep(.filter-box) {
    @apply row-span-2;
}

.filter {
    @apply bg-drop p-4 rounded-lg;
    @apply grid w-full;
    @apply h-[25.5rem] overflow-y-scroll;

    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
}

.table {
    @apply col-span-2;
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
</style>
