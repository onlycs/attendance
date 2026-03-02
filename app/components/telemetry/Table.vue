<script setup lang="ts">
import type { Renderable } from "./Field.vue";
import type { FieldEntry } from "./Fields.vue";

export interface TableEntry<T extends Renderable = Renderable>
    extends FieldEntry<T>
{
    update: T | null;
}

defineProps<{ data: TableEntry[]; }>();
</script>

<template>
    <div class="tbl">
        <span class="title !bg-card-2">Field</span>
        <span class="title">Old</span>
        <span class="title">Changed To</span>

        <TelemetryField
            v-for="({ title, data, update }) of $props.data"
            :title
            :value="data"
            :value2="update ?? 'N/A'"
        />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.title {
    @apply flex justify-center items-center;
    @apply bg-white/9 h-14 w-full rounded-r-md px-8 text-nowrap;
}

.tbl {
    @apply grid w-full mt-4;
    @apply grid-cols-3;
    @apply select-none;
}

:deep(.title), :deep(.value) {
    @apply rounded-none;
}

:deep(.title):first-of-type {
    @apply rounded-tl-md;
}

:deep(.title):nth-of-type(3) {
    @apply rounded-tr-md;
}

:deep(.title):last-of-type {
    @apply rounded-bl-md;
}

:deep(.value):last-of-type {
    @apply rounded-br-md;
}
</style>
