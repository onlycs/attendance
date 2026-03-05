<script setup lang="ts">
const props = defineProps<{
    current: number;
    max: number;
}>();

const current = toRef(props, "current");
const max = toRef(props, "max");

const percentage = computed(() => {
    if (max.value === 0) return 0;
    return (current.value / max.value) * 100;
});

const width = computed(() => ({
    width: `${percentage.value}%`,
}));
</script>

<template>
    <div class="outer">
        <div class="inner" :style="width" />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.outer {
    @apply h-8 w-[32rem] overflow-hidden rounded-[4px] bg-drop p-1.5;
}

.inner {
    @apply h-5 w-0 rounded-[3px] bg-text;
    @apply transition-all duration-300;
    @apply will-change-[width];

    transition-timing-function: linear;
}
</style>
