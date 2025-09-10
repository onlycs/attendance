<script setup lang="ts">
import type { Button } from "#components";

defineProps<{
	trigger: {
		label: string;
		icon: string;
	};
}>();

const { $gsap } = useNuxtApp();
const id = useId();
const open = usePopover();
const wasOpen = ref(false);

const popover = ref<HTMLDivElement>();
const trigger = ref<HTMLDivElement>();

function toggle() {
	if (open.value.equals(id)) {
		open.value = None;
		return;
	}

	open.value = Some(id);
}

watch(open, (open) => {
	if (!popover.value || !trigger.value) return;

	if (open.equals(id)) {
		const bbox = trigger.value.getBoundingClientRect();

		const top = bbox.bottom + 8;
		const left = bbox.left;

		$gsap.set(popover.value, {
			top: `calc(${top}px - 4rem)`,
			left,
		});

		$gsap.to(popover.value, {
			opacity: 1,
			top,
			left,
			...Timing.in,
		});

		wasOpen.value = true;

		return;
	}

	if (!wasOpen.value) return;

	$gsap
		.to(popover.value, {
			opacity: 0,
			top: "-4rem",
			...Timing.out,
		})
		.then(() => {
			$gsap.set(popover.value!, {
				top: `-100%`,
				left: `-100%`,
			});
		});

	wasOpen.value = false;
});
</script>

<template>
	<div class="popover" ref="popover" v-if="open" v-bind="$attrs">
		<slot />
	</div>

	<div class="trigger" ref="trigger">
		<div class="label">
			{{ $props.trigger.label }}
		</div>
		<Button kind="card" class="button" ref="button" @click="toggle">
			<Icon :name="$props.trigger.icon" size="32" />
		</Button>
	</div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.popover {
	@apply fixed -top-full -left-full opacity-0;
	@apply z-50;
}

.trigger {
	@apply flex flex-row items-center w-full;
	@apply bg-drop rounded-lg;
	@apply text-sub;

	.label {
		@apply px-4 py-2 flex-1 justify-center items-center text-center;
	}

	.button {
		@apply flex items-center justify-center;
		@apply p-0 w-10 h-10;
	}
}
</style>