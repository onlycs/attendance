<script setup lang="ts">
import { AgGridVue } from "ag-grid-vue3";

definePageMeta({ layout: "admin-protected" });
</script>

<template>
    <div class="rows">
        <div class="col">
            <WidgetQuickSwipe />
            <WidgetTotals />
        </div>
    </div>

    <AgGridVue
        style="width: 100%; height: 100%"
        :theme="Theme"
    />
</template>

<style scoped>
@reference "~/style/tailwind.css";

.rows {
    @apply w-full h-full;
    @apply flex flex-row gap-2;
}

.col {
    @apply w-fit self-start h-full;
    @apply flex flex-col gap-2;
}
</style>
