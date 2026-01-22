<script setup lang="ts">
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Math2 } from "~/utils/math";

defineProps<{
    params: ICellRendererParams<AgRow, number>;
}>();

type Callback = (data: AgRow, colDef: ColDef<AgRow, number>) => void;
const open = inject<Callback>("open");

const fmt = (h: number) => {
    return {
        [-1]: "No data",
        [0]: "Ongoing",
    }[h] ?? Math2.formatHours(h);
};
</script>

<template>
    <div class="container">
        {{ fmt($props.params.value ?? 0) }}

        <Button
            kind="secondary"
            @click="() => open?.($props.params.data!, $props.params.colDef!)"
            class="button"
        >
            <Icon name="hugeicons:pencil-edit-01" class="icon" :size="16" />
        </Button>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.container {
    @apply flex flex-row items-center justify-between gap-2;
    @apply p-0 pt-px -mr-2 w-[calc(100%+0.5rem)];
}

.icon {
    @apply w-6 h-6 m-0;
}

.button {
    @apply flex items-center justify-center;
    @apply p-0 w-8 h-8;
}
</style>
