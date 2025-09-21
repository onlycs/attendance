<script setup lang="ts">
import { toast } from "vue-sonner";
import { Math2 } from "~/utils/math";

const hours = ref<HoursResponse | null>(null);
const id = useStudentId();
const transition = injectTransition();
const router = useRouter();

const MAX = {
	learning: 8,
	build: 80,
	demo: 4,
} satisfies Record<keyof HoursResponse, number>;

const timing = {
	...Timing,
	offset: 0.015,
};

function makeHours(kind: keyof HoursResponse): [number, number, number] {
	return [
		hours.value![kind],
		Math.max(MAX[kind] - hours.value![kind], 0),
		MAX[kind],
	];
}

function back() {
	transition.out
		.trigger({ reverse: true, timing })
		.then(() => router.push("/student?reverse=true"));
}

onMounted(async () => {
	const res = await ApiClient.alias("studentHours", {
		params: { id: Crypt.sha256(id.value!) },
	});

	if (res.isErr()) {
		apiToast(res.error);
		return;
	}

	setTimeout(() => {
		transition.setup.value = false;
		hours.value = res.value;
		setTimeout(() => transition.in.trigger({ timing }), 100);
	}, 250); // looks like flashing if too fast
});
</script>

<template>
	<div v-if="hours === null">
		<Icon 
			name="svg-spinners:ring-resize" 
			:customize="Customize.StrokeWidth(1)" 
			mode="svg" 
			size="256"
		/>
	</div>
	<div v-else :class="cn('hours-table', !transition.setup.value && 'opacity-0')" >
		<div class="header hidden" />

		<div class="header left">
			Time Earned
		</div>

		<div class="header">
			Time Remaining
		</div>

		<div class="header right">
			Total
		</div>

		<div class="header top">
			Learning
		</div>

		<div class="data" v-for="time in makeHours('learning')">
			{{ Math2.formatHours(time) }}
		</div>

		<div class="header">
			Build
		</div>

		<div class="data build" v-for="time in makeHours('build')">
			{{ Math2.formatHours(time) }}
		</div>

		<div class="header">
			Volunteer
		</div>

		<div class="data" v-for="time in makeHours('demo')">
			{{ Math2.formatHours(time) }}
		</div>

		<Button class="button" kind="card" @click="back">
			<Icon 
				name="hugeicons:arrow-left-01" 
				mode="svg" 
				size="48"
			/>
		</Button>
	</div>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.hours-table {
	@apply grid grid-cols-4 grid-rows-5 gap-1;

	.hidden {
		@apply invisible;
	}

	.data {
		@apply flex justify-center items-center;
		@apply px-8 py-6;
		@apply text-lg md:text-xl bg-drop;
	}

	.header {
		@apply flex justify-center items-center;
		@apply px-8 py-6 bg-card;
		@apply text-2xl;

		&.top {
			@apply rounded-tl-lg;
		}

		&.left {
			@apply rounded-tl-lg;
		}

		&.right {
			@apply rounded-tr-lg;
		}
	}

	.button {
		@apply col-span-4;
		@apply flex flex-row justify-center items-center gap-4;
		@apply px-8 py-6 text-2xl !rounded-t-sm;
	}

	div {
		@apply rounded-sm;
	}
}
</style>