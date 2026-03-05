<script setup lang="ts">
import { Math2 } from "~/utils/math";

export type Renderable = string | number | boolean;

defineProps<{ title: string; value: Renderable; value2?: Renderable }>();

const display = ornullable((value: string | number | boolean) => {
    if (typeof value === "string") return value;
    else if (typeof value === "boolean") return ["Yes", "No"][+!value];
    else if (typeof value === "number") return Math2.round(value, 2);
    else return value;
});
</script>

<template>
    <span class="title">{{ $props.title }}</span>
    <span class="value">{{ display($props.value) }}</span>
    <span class="value" v-if="value2">{{ display($props.value2) }}</span>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.title,
.value {
    @apply flex items-center justify-center;
}

.title {
    @apply h-14 w-full rounded-l-md bg-white/9;
}

.value {
    @apply h-14 w-full rounded-r-md bg-white/3 px-8 text-nowrap;
}
</style>
