<script setup lang="ts">
import { AgGridVue } from "ag-grid-vue3";

const { events, update } = useTelemetry({
    init: {
        query_type: "counted",
        count: 100,
    },
});

definePageMeta({ layout: "admin-protected" });
</script>

<template>
    <RequireWidth :width="1108" class="page">
        <WidgetFilterForm class="filter-box" :update />

        <WidgetQuickSwipe />
        <WidgetTotals />
        <WidgetChart />

        <WidgetRoot :required="['telemetry']" class="table">
            <AgGridVue
                style="width: 100%; height: 100%"
                :theme="Theme"
                :columnDefs="AgTelemetryCols"
                :rowData="events"
                pagination
                :paginationPageSize="10"
                :paginationPageSizeSelector="[10, 25, 50]"
            />
        </WidgetRoot>
    </RequireWidth>
</template>

<style scoped>
@reference "~/style/tailwind.css";

:deep(.page) {
    @apply w-full h-full;
    @apply grid gap-2;

    grid-template-rows: auto auto auto 1fr;
    grid-template-columns: 1fr auto;
}

:deep(.filter-box) {
    @apply row-span-3;
}

.table {
    @apply col-span-2;
}
</style>
