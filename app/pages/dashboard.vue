<script setup lang="ts">
definePageMeta({ layout: "admin-protected" });
</script>

<template>
    <div class="content">
        <WidgetQuickSwipe />
        <WidgetTotals />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.content {
    @apply w-full h-full;
    @apply grid items-start justify-items-start;
}
</style>
