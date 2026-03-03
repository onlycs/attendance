<script setup lang="ts" generic="T">
import type { Renderable } from "./Field.vue";

export interface FieldEntry<T extends Renderable = Renderable> {
    title: string;
    data: T;
}

defineProps<{ data: FieldEntry[] }>();
</script>

<template>
    <div class="content">
        <TelemetryField
            v-for="{ title, data } of $props.data"
            :title
            :value="data"
        />
    </div>
</template>

<style scoped>
.content {
    @apply grid w-full;
    @apply grid-cols-2;
    @apply select-none;
    row-gap: 1rem;
}
</style>
