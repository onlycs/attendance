<script setup lang="ts">
import "~/style/tailwind.css";
import { Dropdown, type HoverCard } from "#components";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import { AgGridVue } from "ag-grid-vue3";
import { Temporal } from "temporal-polyfill";
import { type AgRow, Theme } from "~/composables/useAgData";

const router = useRouter();
const auth = useAuth();

const loading = ref(false);

const { send, data, ready, reconnect } = useTable({
    auth,
    router,
    loading,
});
const { columns, rows } = useAgData(data);

const hashed = ref("");
const date = ref<Temporal.PlainDate>(Temporal.Now.plainDateISO());
const open = ref(false);
const entries = computed(() => {
    const student = data.value.find((s) => s.hashed === hashed.value);
    if (!student) return [];

    const cell = student.cells.find((c) => c.date.equals(date.value));
    if (!cell) return [];

    return cell.entries;
});

function card(row: AgRow, col: ColDef<AgRow>) {
    hashed.value = Crypt.sha256(row.studentId);
    date.value = Temporal.PlainDate.from(col.field!);
    open.value = true;
}

async function edit(edit: CellValueChangedEvent<AgRow, string>) {
    const admin = auth.admin.value;

    if (admin.status !== "ok") return;
    if (!edit.newValue) return;

    switch (edit.colDef.field) {
        case "first":
            send({
                type: "UpdateStudent",
                hashed: Crypt.sha256(edit.data.studentId),
                updates: [
                    {
                        key: "first",
                        value: await Crypt.encrypt(
                            edit.newValue,
                            admin.password.value,
                        ),
                    },
                ],
            });
            break;
        case "last":
            send({
                type: "UpdateStudent",
                hashed: Crypt.sha256(edit.data.studentId),
                updates: [
                    {
                        key: "last",
                        value: await Crypt.encrypt(
                            edit.newValue,
                            admin.password.value,
                        ),
                    },
                ],
            });
            break;
    }
}

provide("onopen", card);

onMounted(async () => {
    const font = new FontFace(
        "JetBrainsMono Nerd Font",
        "url('/fonts/JetBrainsMono.ttf')",
        { style: "normal", weight: "400" },
    );

    await font.load();
    document.fonts.add(font);
});

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

    for (const student of data.value) {
        for (const cell of student.cells) {
            for (const entry of cell.entries) {
                records.push(
                    [
                        student.id,
                        student.first,
                        student.last,
                        entry.start.toString({ timeZoneName: "never" }),
                        entry.end
                            ? entry.end.toString({ timeZoneName: "never" })
                            : "",
                        (!entry.end).toString(),
                        entry.kind,
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

definePageMeta({ layout: "admin-protected" });

defineExpose({ Dropdown });
</script>

<template>
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
                @click="$router.push('/admin?reverse=true')"
            >
                <Icon name="hugeicons:logout-02" size="22" />
                Exit
            </Button>

            <Button kind="card" class="button" @click="exportCSV">
                <Icon name="hugeicons:file-export" size="22" />
                Export
            </Button>

            <Button v-if="reconnect" kind="error-transparent" class="button">
                <Icon name="hugeicons:connect" size="22" />
                Reconnect
            </Button>

            <Icon
                v-if="loading"
                name="svg-spinners:ring-resize"
                :customize="Customize.StrokeWidth(2)"
                mode="svg"
                size="22"
                class="ml-2"
            />
        </div>

        <div class="table-container">
            <AgGridVue
                style="width: 100%; height: 100%"
                :columnDefs="columns"
                :rowData="rows"
                :theme="Theme"
                :defaultColDef="{
                    resizable: true,
                    sortable: true,
                    filter: true,
                    suppressMovable: false,
                }"
                @cellValueChanged="edit"
            ></AgGridVue>
        </div>
    </div>

    <HoverCard v-model:open="open">
        <Edit :entries="entries" :push="send" :hashed="hashed" :date="date" />
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
    @apply absolute top-[62%]; /* golden ratio cooks */

    line-height: 1.25;
}
</style>
