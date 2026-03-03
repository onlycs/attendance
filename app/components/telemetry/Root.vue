<script setup lang="ts">
defineProps<{ denied: boolean }>();
</script>

<template>
    <div class="data">
        <HiddenText v-if="denied" icon="hugeicons:information-circle">
            You don't have permission to view this event.
        </HiddenText>

        <slot v-else />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.data {
    @apply w-full;
    @apply flex flex-col items-center justify-center;
}
</style>
