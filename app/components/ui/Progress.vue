<script setup lang="ts">
const props = defineProps<{
    current: number;
    max: number;
}>();

const { $gsap } = useNuxtApp();
const current = toRef(props, "current");
const max = toRef(props, "max");

const percentage = computed(() => {
    if (max.value === 0) return 0;
    return current.value / max.value;
});

const factor = 31.25; // 32rem - 0.75rem (total padding)

function update(progress: number) {
    $gsap.to(".inner", {
        width: `${progress * factor}rem`,
        ...Timing.smooth.in,
    });
}

watch(percentage, update);
onMounted(() => {
    update(percentage.value);
});
</script>

<template>
    <div class="outer">
        <div class="inner" />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.outer {
    @apply bg-drop w-[32rem] h-8 rounded-[4px] overflow-hidden p-1.5;
}

.inner {
    @apply bg-text rounded-[3px] h-5 w-0;
}
</style>
