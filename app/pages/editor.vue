<script setup lang="ts">
import { EditorDropdown } from "#components";
import type {
    CellValueChangedEvent,
    SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridVue } from "ag-grid-vue3";
import { Temporal } from "temporal-polyfill";
import type { DeepReadonly } from "vue";
import { toast } from "vue-sonner";
import { type AgRow, Theme } from "~/composables/useAgData";
import api from "~/utils/api";

const { user } = useAuth();
const router = useRouter();
const crypto = useCrypto();

const connected = ref(false);
const selected = ref<string[]>([]);

const creds = ref<typeof user["value"] & { role: "admin"; ok: true; }>(null!);
const reconnect = ref<() => void>(() => {});
const rows = late<DeepReadonly<Ref<Row[]>> | null>();
const ag = ref<ReturnType<typeof useAgData> | null>(null);

watch(user, (user) => {
    if (user.role !== "admin") return;
    if (!user.ok) return;
    creds.value = { ...user };
}, { immediate: true });

watch(creds, async (user) => {
    const tbl = await useTable({
        connected,
        onError: () => toast.error("Failed to replicate"),
        user,
    });

    if (!tbl) return;
    reconnect.value = tbl.reconnect;
    rows.value = tbl.data;
    ag.value = useAgData(tbl.data);
});

async function edit(edit: CellValueChangedEvent<AgRow, string>) {
    const k1 = hex.asbytes(creds.value.k1);
    if (!edit.newValue) return;

    switch (edit.colDef.field) {
        case "first": {
            const [first] = await crypto.encrypt([edit.newValue], k1) ?? [null];
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
            const [last] = await crypto.encrypt([edit.newValue], k1) ?? [null];
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

    for (const student of (rows.value?.value ?? [])) {
        for (const cell of student.cells) {
            for (const entry of cell.records) {
                records.push(
                    [
                        student.id,
                        student.first,
                        student.last,
                        api.datetime.ser(entry.sign_in),
                        api.datetime.ser(entry.sign_out) ?? "",
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
    await Promise.all(selected.value.map(async (id) => {
        const res = await api.student.delete({
            path: { id_hashed: sha256(id) },
        });

        if (!res.data) api.error(res.error, res.response);
    }));
}

// const AddStudentOpen = ref(false);
// const AddStudentSubmit = async (id: string, first: string, last: string) => {
//     const admin = auth.admin.value;

//     if (admin.status !== "ok") return;

//     send({
//         type: "AddStudent",
//         student: {
//             id: await Crypt.encrypt(id, admin.password.value),
//             hashed: Crypt.sha256(id),
//             first: await Crypt.encrypt(first, admin.password.value),
//             last: await Crypt.encrypt(last, admin.password.value),
//         },
//     });
// };

// const AddDateOpen = ref(false);
// const AddDateSubmit = async (sub: AddDateSubmission) => {
//     const admin = auth.admin.value;

//     if (admin.status !== "ok") return;

//     const now = Temporal.Now.zonedDateTimeISO();

//     send({
//         type: "AddEntry",
//         date: sub.date,
//         hashed: Crypt.sha256(sub.student),
//         entry: {
//             start: sub.date.toPlainDateTime(sub.start).toZonedDateTime(now),
//             end: sub.date.toPlainDateTime(sub.end).toZonedDateTime(now),
//             kind: sub.kind as any,
//         },
//     });
// };

definePageMeta({ layout: "admin-protected" });
defineExpose({ Dropdown: EditorDropdown });
</script>

<template>
    <EditorAddStudent
        v-model:open="AddStudentOpen"
        @submit="AddStudentSubmit"
    />

    <EditorAddDate
        v-model:open="AddDateOpen"
        :students="Object.fromEntries(
            rows.map((
                row,
            ) => [row.studentId, row.first + ' ' + row.last]),
        )"
        @submit="AddDateSubmit"
    />

    <div v-if="!ready.ok.value" class="loading">
        <div class="title">Loading Editor</div>

        <Progress
            class="progress"
            :current="ready.progress.value"
            :max="ready.progressmax.value"
        />
        {{ ready.task }}
    </div>

    <div class="page" v-else>
        <div class="utilities">
            <Button
                kind="card"
                class="button exit"
                @click="$router.push('/dashboard?reverse=true')"
            >
                <Icon name="hugeicons:logout-02" size="22" />
                Exit
            </Button>

            <Button kind="card" class="button" @click="exportCSV">
                <Icon name="hugeicons:file-export" size="22" />
                Export All
            </Button>

            <Button
                kind="card"
                class="button"
                @click="() => AddStudentOpen = true"
            >
                <Icon name="hugeicons:user-add-01" size="22" />
                Add Student
            </Button>

            <Button
                kind="card"
                class="button"
                @click="() => AddDateOpen = true"
            >
                <Icon name="hugeicons:calendar-add-01" size="22" />
                Add Date
            </Button>

            <Button
                kind="error-transparent"
                class="button"
                :disabled="selected.length === 0"
                @click="onDelete"
            >
                <Icon name="hugeicons:delete-03" size="22" />
                Delete {{ selected.length }} Students
            </Button>

            <Button v-if="reconnect" kind="error-transparent" class="button">
                <Icon name="hugeicons:connect" size="22" />
                Reconnect
            </Button>
        </div>

        <div class="table-container">
            <AgGridVue
                style="width: 100%; height: 100%"
                :columnDefs="columns"
                :rowData="rows"
                :theme="Theme"
                :rowSelection="{
                    mode: 'multiRow',
                }"
                :selectionColumnDef="{
                    pinned: 'left',
                }"
                :defaultColDef="{
                    resizable: true,
                    sortable: true,
                    filter: true,
                    suppressMovable: true,
                }"
                @cellValueChanged="edit"
                @selection-changed="(event: SelectionChangedEvent<AgRow>) => {
                    selected = event.api
                        .getSelectedRows()
                        .map((row) => row.studentId);
                }"
            ></AgGridVue>
        </div>
    </div>

    <HoverCard v-model:open="open">
        <EditorCard
            :key="update"
            :entries
            :push="send"
            :hashed
            :date
        />
    </HoverCard>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply flex flex-col;
    @apply w-full h-full;
}

.table-container {
    @apply flex flex-row px-2 pb-2;
    @apply flex-1 min-h-0;

    .table {
        @apply w-full h-full;
    }
}

.utilities {
    @apply flex flex-row items-center;
    @apply w-full p-2 gap-2;

    .button {
        @apply flex flex-row items-center gap-2;

        &.exit {
            @apply text-red-500;
        }
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
