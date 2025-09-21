<script setup lang="ts">
const { $gsap } = useNuxtApp();

const wrapper = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);

const radius = 100;
const visible = ref(false);
const mouseX = ref(0);
const mouseY = ref(0);

function mouse(event: MouseEvent) {
	if (!wrapper.value) return;

	const rect = wrapper.value.getBoundingClientRect();
	mouseX.value = event.clientX - rect.left;
	mouseY.value = event.clientY - rect.top;

	update();
}

function hover() {
	visible.value = true;
	update();
}

function unhover() {
	visible.value = false;
	update();
}

function update() {
	if (!wrapper.value) return;

	const size = visible.value ? `${radius}px` : `0px`;

	const gradient = `radial-gradient(
		${size} circle at ${mouseX.value}px ${mouseY.value}px,
		#ffffff,
		transparent 80%
	)`;

	$gsap.to(wrapper.value, {
		background: gradient,
		...Timing.slow.in,
	});
}

defineEmits<(e: "update:modelValue", value: string | number | null) => void>();
</script>

<template>
	<div
		class="wrapper"
		ref="wrapper"
		@mousemove="mouse"
		@mouseenter="hover"
		@mouseleave="unhover"
	>
		<input 
			ref="input" 
			class="input" 
			v-bind="$attrs" 
			autocomplete="off" 
			@input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
		/>
	</div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.wrapper {
	@apply rounded-lg p-[1px] transition;
}

.input {
	@apply flex h-10 w-full bg-card px-3 py-2;
	@apply rounded-md border border-border;
	@apply text-sm placeholder:text-sub;

	@apply focus-visible:outline-none focus-visible:ring-[1px] focus-visible:ring-white;
	@apply disabled:cursor-not-allowed disabled:opacity-50;
	
	@apply transition-all;
}
</style>
