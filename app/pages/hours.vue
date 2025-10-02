<script setup lang="ts">
import {
	ApiClient,
	apiToast,
	type HoursResponse,
	type HourType,
} from "~/utils/api";
import { Math2 } from "~/utils/math";

const hours = ref<HoursResponse | null>(null);
const auth = useAuth();
const transition = injectTransition();
const router = useRouter();

const MAX = {
	learning: 8,
	build: 60,
	demo: 4,
} satisfies Record<Exclude<HourType, "offseason">, number>;

const timing = {
	...Timing,
	offset: 0.015,
};

function makeHours(
	kind: Exclude<HourType, "offseason">,
): [number, number, number] {
	return [
		hours.value![kind],
		Math.max(MAX[kind] - hours.value![kind], 0),
		MAX[kind],
	];
}

function redirect(url: string) {
	transition.out
		.trigger({ reverse: true, timing })
		.then(() => router.push(url));
}

function back() {
	redirect("/student?reverse=true");
}

onMounted(async () => {
	if (auth.student.value.status !== "ok") {
		auth.clear();
		redirect("/");
		return;
	}

	const res = await ApiClient.fetch("student/hours", {
		params: { id: Crypt.sha256(auth.student.value.id.value) },
	});

	console.log(res);

	if (res.isErr()) {
		apiToast(res.error, redirect);
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
    <Icon name="svg-spinners:ring-resize" :customize="Customize.StrokeWidth(1)" mode="svg" size="256" />
  </div>
  <div v-else :class="cn('hours-table', !transition.setup.value && 'opacity-0')">
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
      Outreach
    </div>

    <div class="data" v-for="time in makeHours('demo')">
      {{ Math2.formatHours(time) }}
    </div>

    <div class="header">
      Offseason
    </div>

    <div class="data">
      {{ Math2.formatHours(hours.offseason) }}
    </div>

    <div class="data select-none cursor-not-allowed !bg-black/75 col-span-2">
      N/A
    </div>

    <Button class="button" kind="card" @click="back">
      <Icon name="hugeicons:arrow-left-01" mode="svg" size="48" />
    </Button>
  </div>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.hours-table {
  @apply grid grid-cols-4 grid-rows-6 gap-1;

  .hidden {
    @apply invisible;
  }

  .data {
    @apply flex justify-center items-center;
    @apply px-8 py-6 bg-drop;
    @apply text-lg md:text-xl;
  }

  .header {
    @apply flex justify-center items-center;
    @apply px-8 py-6 bg-card;
    @apply text-2xl font-semibold select-none;

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
