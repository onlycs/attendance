<script setup lang="ts">
import type { ICellRendererParams } from "ag-grid-community";
import type { Event, TelemetryEvent } from "~/utils/api";

defineProps<{ params: ICellRendererParams<TelemetryEvent, Event> }>();

type Callback = (data: TelemetryEvent) => void;
const open = inject<Callback>("open");
</script>

<template>
    <Button
        class="cell"
        class:content="gap-2 text-xs"
        kind="secondary"
        @click="() => open?.(params.data!)"
    >
        <Icon name="hugeicons:information-circle" size="18" />
    </Button>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.cell {
    @apply my-1 -ml-2 h-[calc(100%-0.5rem)] w-[calc(100%+1rem)] p-0;
    @apply text-xs text-sub;
}
</style>
