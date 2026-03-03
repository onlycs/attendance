<script setup lang="ts">
import { EditorDropdown } from "#components";
import type {
    CellValueChangedEvent,
    ColDef,
    SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridVue } from "ag-grid-vue3";
import { Temporal } from "temporal-polyfill";
import { toast } from "vue-sonner";
import { type AgRow, Theme } from "~/composables/useAgData";
import api from "~/utils/api";
import { Math2 } from "~/utils/math";

const { user } = useAuth();
const router = useRouter();
const crypto = useCrypto();

const selected = ref<string[]>([]);

const { connected, reconnect, data } = useTable();
const creds = ref<AdminCreds>(null!);
const ag = useAgStudents(data);

watch(
    user,
    (user) => {
        if (user.role !== "admin") return;
        if (!user.ok) return;

        const perms = user.claims.perms;

        if (!perms.student_view || !perms.hours_view) {
            router.push(redirect.build("/dashboard", "unauthorized"));
        }

        creds.value = { ...user };
    },
    { immediate: true },
);

async function edit(edit: CellValueChangedEvent<AgRow, string>) {
    const k1 = hex.asbytes(creds.value.k1);
    if (!edit.newValue) return;

    switch (edit.colDef.field) {
        case "first": {
            const [first] = (await crypto.encrypt([edit.newValue], k1)) ?? [
                null,
            ];
            if (!first) {
                toast.error("Failed to encrypt data");
                return;
            }

            const res = await api.student.update({
                body: { first },
                path: { id_hashed: sha256(edit.data.studentId) },
            });

            if (!res.data) {
                api.error(res.error, res.response);
            }

            break;
        }
        case "last": {
            const [last] = (await crypto.encrypt([edit.newValue], k1)) ?? [
                null,
            ];
            if (!last) {
                toast.error("Failed to encrypt data");
                return;
            }

            const res = await api.student.update({
                body: { last },
                path: { id_hashed: sha256(edit.data.studentId) },
            });

            if (!res.data) {
                api.error(res.error, res.response);
            }

            break;
        }
    }
}

// export
function exportCSV() {
    const header = [
        "Student ID",
        "First Name",
        "Last Name",
        "Sign In",
        "Sign Out",
        "In Progress?",
        "For",
    ];

    const records = [header.join(",")];

    for (const student of data.value.values()) {
        for (const cell of student.cells ?? []) {
            for (const entry of cell.records) {
                records.push(
                    [
                        student.id,
                        student.first,
                        student.last,
                        Math2.formatDate(entry.sign_in),
                        ornull(Math2.formatDate)(entry.sign_out) ?? "",
                        entry.sign_out === null ? "Yes" : "No",
                        entry.hour_type,
                    ].join(","),
                );
            }
        }
    }

    const blob = new Blob([records.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", "time-entries.csv");
    link.click();
}

async function onDelete() {
    await Promise.all(
        selected.value.map(async (id) => {
            const res = await api.student.delete({
                path: { id_hashed: sha256(id) },
            });

            if (!res.data) api.error(res.error, res.response);
        }),
    );
}

const studentOpen = ref(false);
const entryOpen = ref(false);

const sHashed = ref("");
const sDate = ref<Temporal.PlainDate>(Temporal.Now.plainDateISO());
const sOpen = ref(false);
const sEntries = ref<AttendanceRecord[]>([]);
const sWrap = { e: sEntries };

// idrc about ag, but once it's updated, we get a ref in rows, which matters
// also, this effect only runs once praise the lord
watch([data, sHashed, sDate], ([data, hashed, date]) => {
    const student = data.get(hashed);
    if (!student) return [];

    student.cells ??= [];
    const cell = student.cells.find((c) => c.date.equals(date));
    if (!cell) return [];

    sEntries.value = [...cell.records];
});

const studentKv = studentNames(data);

provide("open", (row: AgRow, col: ColDef<AgRow, number>) => {
    sHashed.value = sha256(row.studentId);
    sDate.value = Temporal.PlainDate.from(col.field!);
    sOpen.value = false;
    setTimeout(() => (sOpen.value = true), 100);
});

definePageMeta({ layout: "admin-protected" });
defineExpose({ Dropdown: EditorDropdown });
</script>

<template>
    <EditorAddStudent v-model:open="studentOpen" />

    <EditorAddDate
        v-if="Object.keys(studentKv).length > 0"
        v-model:open="entryOpen"
        :students="studentKv"
    />

    <div class="page">
        <div class="utilities">
            <Button
                kind="danger"
                class="!w-fit"
                class:content="button"
                @click="$router.push('/dashboard')"
            >
                <Icon name="hugeicons:logout-02" size="22" />
                Exit
            </Button>

            <Button
                kind="secondary"
                class="!w-fit"
                class:content="button"
                @click="exportCSV"
            >
                <Icon name="hugeicons:file-export" size="22" />
                Export All
            </Button>

            <Button
                kind="secondary"
                class="!w-fit"
                class:content="button"
                @click="() => (studentOpen = true)"
                :disabled="!creds?.claims.perms.student_add"
            >
                <Icon name="hugeicons:user-add-01" size="22" />
                Add Student
            </Button>

            <Button
                kind="secondary"
                class="!w-fit"
                class:content="button"
                @click="() => (entryOpen = true)"
                :disabled="!creds?.claims.perms.hours_edit"
            >
                <Icon name="hugeicons:calendar-add-01" size="22" />
                Add Date
            </Button>

            <Button
                kind="danger"
                class="!w-fit"
                class:content="button"
                :disabled="
                    selected.length === 0 || !creds?.claims.perms.student_delete
                "
                @click="onDelete"
            >
                <Icon name="hugeicons:delete-03" size="22" />
                Delete {{ selected.length }} Students
            </Button>

            <Button
                v-if="!connected"
                kind="warning"
                class="!w-fit"
                class:content="button"
                @click="reconnect"
            >
                <Icon name="hugeicons:connect" size="22" />
                Reconnect
            </Button>
        </div>

        <div class="table-container">
            <AgGridVue
                style="width: 100%; height: 100%"
                :column-defs="ag.columns.value"
                :row-data="ag.rows.value"
                :theme="Theme"
                :row-selection="{ mode: 'multiRow' }"
                :selection-column-def="{ pinned: 'left' }"
                :default-col-def="{
                    resizable: true,
                    sortable: true,
                    filter: true,
                    suppressMovable: true,
                }"
                @cell-value-changed="edit"
                @selection-changed="
                    (event: SelectionChangedEvent<AgRow>) => {
                        selected = event.api
                            .getSelectedRows()
                            .map((row) => row.studentId);
                    }
                "
            />
        </div>
    </div>

    <HoverCard v-model:open="sOpen">
        <EditorCard
            :key="sHashed + sDate.toJSON()"
            :entries="sWrap.e"
            :hashed="sHashed"
            :date="sDate"
        />
    </HoverCard>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply flex flex-col relative gap-2;
    @apply w-full h-full;
}

.table-container {
    @apply flex flex-row;
    @apply flex-1 min-h-0;

    .table {
        @apply w-full h-full;
    }
}

.utilities {
    @apply flex flex-row items-center;
    @apply w-fit gap-2;
}

.utilities :deep(.button) {
    @apply flex flex-row items-center gap-2;
    @apply whitespace-nowrap;

    &.exit {
        @apply text-red-500;
    }
}

.loading {
    .title {
        @apply text-4xl fixed top-[35%];
    }

    @apply flex items-center justify-center flex-col gap-3;
    @apply text-xl;
    @apply absolute top-[62%];

    line-height: 1.25;
}
</style>
