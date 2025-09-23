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
	length: {
		type: Number,
		required: true,
	},
});

const mobile = useMobile();

let width = ref(3);
let height = ref(1);
let gridStyle = computed(() => ({
	gridTemplateColumns: `repeat(${mobile.value ? height.value : width.value}, minmax(0, 1fr))`,
	gridTemplateRows: `repeat(${mobile.value ? width.value : height.value}, minmax(0, 1fr))`,
}));

function set(w: number, h: number) {
	width.value = w;
	height.value = h;
}

const animate = toRef(props, "animate");
const showText = toRef(props, "showText");
const container = ref<HTMLDivElement>();

provide("animate", readonly(animate));
provide("showText", readonly(showText));

defineExpose({ container });

onMounted(() => {
	// getCurrentInstance().default().length does not take into account v-if, so use a prop
	switch (props.length) {
		case 1:
			set(1, 1);
			break;
		case 2:
			set(2, 1);
			break;
		case 3:
			set(3, 1);
			break;
		case 4:
			set(2, 2);
			break;
		case 5:
			throw new Error("FocusCards does not support 5 children");
		case 6:
			set(3, 2);
			break;
		default:
			throw new Error("FocusCards supports between 1 and 6 children.");
	}
});
</script>

<template>
    <div :class="cn('card-container', animate && 'animate')" :style="gridStyle" ref="container">
        <slot />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.card-container {
    @apply grid place-items-center;
    @apply gap-10 md:gap-12 lg:gap-22 xl:gap-32 2xl:gap-42;

	&.animate:has(.focus-card:hover) > *:not(:hover) {
		@apply blur-xs;
	}
}
</style>
