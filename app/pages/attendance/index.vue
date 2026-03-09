<script setup lang="ts">
import type { HourType } from "~/utils/api";
import { f } from "~/utils/form";

definePageMeta({ layout: "admin-protected" });

const ht = await f.hourtype.available();
const selected = ref<HourType | null>(null);
const code = ref();

const kind = computed(() => ref(selected.value ?? "demo"));
</script>

<template>
    <div class="page">
        <Select
            v-bind="ht.props"
            v-model="selected"
            :rows="Object.keys(ht.props.kv).length"
        />

        <div class="qr">
            <AttendanceTotp :kind="kind" v-model:code="code" />
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply grid h-full w-full;
    grid-template-rows: 1fr auto 1fr;
}

.qr:deep(.vline) {
    @apply hidden;
}

.qr {
    @apply flex flex-col gap-2;
}

.qr:deep(img) {
    @apply h-[calc(100vw-1rem)] w-[calc(100vw-1rem)];
}
</style>
