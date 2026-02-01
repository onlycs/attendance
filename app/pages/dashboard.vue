<script setup lang="ts">
definePageMeta({ layout: "admin-protected" });
</script>

<template>
    <div class="rows">
        <div class="col">
            <WidgetQuickSwipe />
            <WidgetTotals />
        </div>
    </div>
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
