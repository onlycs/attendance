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
    @apply bg-drop w-[32rem] h-8 rounded-[4px] overflow-hidden p-1.5;
}

.inner {
    @apply bg-text rounded-[3px] w-0 h-5;
    @apply transition-all duration-300;
    @apply will-change-[width];

    transition-timing-function: linear;
}
</style>
