<script setup lang="ts">
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Math2 } from "~/utils/math";

defineProps<{
    params: ICellRendererParams<AgRow, number>;
}>();

const onopen = inject<(data: AgRow, colDef: ColDef<AgRow, number>) => void>(
    "onopen",
);

const fmt = (h: number) => (h === 0 ? "No Data" : Math2.formatHours(h));
</script>

<template>
    <div class="container">
        {{ fmt($props.params.value ?? 0) }}

        <Button
            kind="card"
            @click="() =>
            onopen?.($props.params.data!, $props.params.colDef!)"
            class="button"
            static
        >
            <Icon name="hugeicons:pencil-edit-01" class="icon" :size="16" />
        </Button>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.container {
    @apply flex flex-row items-center justify-between gap-2;
    @apply w-full p-0;
}

.icon {
    @apply w-6 h-6 m-0;
}

.button {
    @apply flex items-center justify-center;
    @apply p-0 w-8 h-8;
}
</style>
