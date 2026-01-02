<script setup lang="ts">
defineProps<{ dashless?: boolean; lineless?: boolean; }>();
const link = ref<HTMLElement | null>(null);

function update(event: MouseEvent) {
    if (!link.value) return;

    const rect = link.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    link.value.style.setProperty("--mouse-x", `${percentage}%`);
}
</script>

<template>
    <a
        @mouseenter="update"
        @mousemove="update"
        class="link"
        target="_blank"
        ref="link"
    >
        <slot />
        <span v-if="!$props.dashless" class="dashes" />
        <span v-if="!$props.lineless" class="line" />
    </a>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.link {
    @apply relative cursor-pointer;
    --mouse-x: 50%;
}

.line {
    @apply absolute bottom-[2px] left-0 -mt-1;
    @apply h-[1px] w-full bg-text;
    @apply pointer-events-none;

    transform: scaleX(0);
    transform-origin: var(--mouse-x) 50%;
    transition: transform 0.15s;
}

a:hover .line {
    transform: scaleX(1);
    transition: transform 0.1s;
}

.dashes {
    @apply absolute bottom-[2px] left-0;
    @apply h-0 w-full;
    @apply border-b-[1px] border-dashed border-white/40;
}

a:hover .dashes {
    @apply transition-all duration-150;
    @apply border-white/10;
}
</style>
