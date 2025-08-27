<script setup lang="ts">
const { $gsap } = useNuxtApp();

defineProps<{ dashless?: boolean; lineless?: boolean }>();

const link = ref<HTMLElement | null>(null);
const underline = ref<HTMLElement | null>(null);

function enter(event: MouseEvent) {
	if (!link.value || !underline.value) return;

	const rect = link.value.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const percentage = (x / rect.width) * 100;

	$gsap.set(underline.value, { transformOrigin: `${percentage}% 50%` });
	$gsap.to(underline.value, { scaleX: 1, ...Timing.fast.in });
}

function leave() {
	if (!underline.value) return;

	$gsap.to(underline.value, { scaleX: 0, ...Timing.fast.out });
}
</script>

<template>
    <a
        class="relative cursor-pointer"
        @mouseenter="enter"
        @mouseleave="leave"
        target="_blank"
        ref="link"
    >
        <slot />
        <span v-if="!$props.dashless" class="dashes" />
        <span v-if="!$props.lineless" class="line" ref="underline" />
    </a>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.line {
    @apply absolute bottom-[2px] left-0 -mt-1;
    @apply h-[1px] w-full bg-text;
    @apply scale-x-0 pointer-events-none;
}

.dashes {
    @apply absolute bottom-[2px] left-0;
    @apply h-0 w-full;
    @apply border-b-[1px] border-dashed border-border;
}
</style>
