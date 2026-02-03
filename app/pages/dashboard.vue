<script setup lang="ts">
import { AgGridVue } from "ag-grid-vue3";

definePageMeta({ layout: "admin-protected" });
</script>

<template>
    <div class="page">
        <div class="filter"></div>

        <WidgetQuickSwipe />
        <WidgetTotals />

        <AgGridVue
            style="width: 100%; height: 100%; grid-column: span 2 / span 2"
            :theme="Theme"
        />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply w-full h-full;
    @apply grid gap-2;

    grid-template-rows: auto auto 1fr;
    grid-template-columns: 1fr auto;
}

.filter {
    @apply row-span-2;
}

.table {
    @apply col-span-2;
}
</style>
