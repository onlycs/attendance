<script setup lang="ts">
const props = defineProps<{ duration: number }>();
const remaining = defineModel<number>("timer", { required: true });
const emit = defineEmits<{ complete: [] }>();

let rafId: number | null = null;
let lastTime: number | null = null;

watch(remaining, () => {
    if (remaining.value >= 0 && rafId === null) {
        lastTime = null;
        rafId = requestAnimationFrame(tick);
    }
});

function tick(now: number) {
    if (lastTime !== null) {
        const dt = (now - lastTime) / 1000;
        remaining.value = Math.max(remaining.value - dt, 0);

        if (remaining.value <= 0) {
            rafId = null;
            emit("complete");
            return; // stop the loop
        }
    }

    lastTime = now;
    rafId = requestAnimationFrame(tick);
}

onMounted(() => {
    rafId = requestAnimationFrame(tick);
});

onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<template>
    <Progress :current="remaining" :max="props.duration" />
</template>
