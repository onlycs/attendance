<script setup lang="ts">
import { TelemetryDataCell } from "#components";
import { AgGridVue } from "ag-grid-vue3";
import { type Event, EventTypeTitles, type TelemetryEvent } from "~/utils/api";

const { events, update } = useTelemetry({
    init: {
        query_type: "counted",
        count: 100,
    },
});

const open = ref(false);
const event = ref<Event | null>(null);

provide("open", (data: TelemetryEvent) => {
    event.value = data.event;
    open.value = true;
});

definePageMeta({ layout: "admin-protected" });
defineExpose({ EventInfo: TelemetryDataCell });
</script>

<template>
    <RequireWidth :width="1108" class="page">
        <Dialog v-model:open="open">
            <template #title>
                {{
                    EventTypeTitles[
                        event?.event ?? "admin_delete"
                    ]
                }} Event
            </template>
            <TelemetryEventView v-if="event" :event />
        </Dialog>

        <div class="column w-full">
            <WidgetFilterForm class="filter-box" :update />

            <WidgetRoot :required="['telemetry']" class="table h-full">
                <AgGridVue
                    style="width: 100%; height: 100%"
                    :theme="Theme"
                    :columnDefs="AgTelemetryCols"
                    :rowData="events"
                    pagination
                    :paginationPageSize="15"
                    :paginationPageSizeSelector="[10, 15, 25, 50]"
                />
            </WidgetRoot>
        </div>

        <div class="column w-fit">
            <WidgetQuickSwipe />
            <WidgetTotals />
            <WidgetChart />
            <WidgetStudentHours />
        </div>
    </RequireWidth>
</template>

<style scoped>
@reference "~/style/tailwind.css";

:deep(.page) {
    @apply w-full h-full;
    @apply flex flex-row gap-2;
}

.column {
    @apply h-full;
    @apply flex flex-col gap-2;
}
</style>
