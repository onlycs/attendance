<script setup lang="ts">
const props = defineProps({
	animate: {
		type: Boolean,
		default: true,
	},
	showText: {
		type: Boolean,
		default: false,
	},
});

const animate = toRef(props, "animate");
const showText = toRef(props, "showText");
const container = ref<HTMLDivElement>();

provide("animate", readonly(animate));
provide("showText", readonly(showText));

defineExpose({ container });
</script>

<template>
    <div :class="cn('card-container', animate && 'animate')" ref="container">
        <slot />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.card-container {
    @apply flex md:flex-row max-md:flex-col;
    @apply justify-center items-center;
    @apply gap-10 md:gap-12 lg:gap-22 xl:gap-32 2xl:gap-42;

	&.animate:has(.focus-card:hover) > *:not(:hover) {
		@apply blur-xs;
	}
}
</style>
