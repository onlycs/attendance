<script setup lang="ts">
const ANIMATE_IN_Y = 64;

const open = defineModel("open", {
	type: Boolean,
	default: false,
});

const mouse = useMouse();
const pos = ref([0, 0] as [number, number]);
const card = ref<HTMLDivElement>();
const { $gsap } = useNuxtApp();

watch(open, (isOpen) => {
	if (!isOpen) {
		if (!card.value) return;

		$gsap.to(card.value, {
			top: pos.value[1] - ANIMATE_IN_Y,
			opacity: 0,
			...Timing.out,
		});

		$gsap.set(card.value, {
			left: "-100%",
			top: "-100%",
		});
	} else {
		pos.value = [mouse.x.value, mouse.y.value];
	}
});

watch(pos, (position) => {
	if (!card.value) return;

	$gsap.set(card.value, {
		left: position[0],
		top: position[1] - ANIMATE_IN_Y,
	});

	$gsap.to(card.value, {
		top: position[1],
		opacity: 1,
		...Timing.in,
	});
});
</script>

<template>
	<div class="card" ref="card" v-if="open" v-bind="$attrs">
		<slot />
	</div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.card {
	@apply fixed -top-full -left-full opacity-0;
	@apply z-50;
}
</style>