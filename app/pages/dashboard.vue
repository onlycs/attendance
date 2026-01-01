<script setup lang="ts">
definePageMeta({ layout: "admin-protected" });
</script>

<template>
    <div class="content">
        <Sidebar />
        <div></div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.content {
    display: grid;
    grid-template-columns: auto 1fr;

    @apply w-full h-full p-2;
}
</style>
