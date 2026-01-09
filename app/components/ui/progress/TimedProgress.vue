<script setup lang="ts">
const props = defineProps<{ duration: number; }>();
const remaining = defineModel<number>("timer", { required: true });
const emit = defineEmits<{ complete: []; }>();

const basis = ref(new Date().getTime() / 1000);

function animate() {
    const dt = (new Date().getTime() / 1000) - basis.value;
    const rem = Math.max(remaining.value - dt, 0);

    remaining.value = rem;

    if (rem <= 0) {
        emit("complete");
        return;
    }
}

function animloop() {
    animate();
    basis.value = new Date().getTime() / 1000;
    setTimeout(() => requestAnimationFrame(animloop), 200);
}

onMounted(() => requestAnimationFrame(animloop));
</script>

<template>
    <Progress :current="remaining" :max="props.duration" />
</template>
