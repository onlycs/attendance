<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { set } from "zod";
import { Math2 } from "~/utils/math";

export interface TimePickerProps {
	icon?: string;
	color?: "red" | "green" | "gray";
}

const { icon, color } = defineProps<TimePickerProps>();
const time = defineModel<Temporal.PlainTime>("time");
const temp = ref(time.value ?? Temporal.Now.plainTimeISO());
const emit = defineEmits<{ submit: [Temporal.PlainTime] }>();
const etime = computed({
	get() {
		return time.value ?? temp.value;
	},
	set(v: Temporal.PlainTime) {
		if (active.value >= 6) {
			time.value = Temporal.PlainTime.from(v);
			temp.value = Temporal.PlainTime.from(v);
			return;
		}

		if (time.value) time.value = Temporal.PlainTime.from(v);
		else temp.value = Temporal.PlainTime.from(v);
	},
});

const hour = computed<[number, number]>(() => {
	const h24 = etime.value.hour;
	const h12 = h24 % 12 || 12;
	return [Math.floor(h12 / 10), h12 % 10] as const;
});

const minute = computed(() => {
	const m = etime.value.minute;
	return [Math.floor(m / 10), m % 10] as const;
});

const seconds = computed(() => {
	const s = etime.value.second;
	return [Math.floor(s / 10), s % 10] as const;
});

const isA = computed(() => {
	return etime.value.hour < 12;
});

const period = computed(() => {
	return isA.value ? "AM" : "PM";
});

const active = ref(-1);
const input = ref<HTMLDivElement>();

function placement(i: number) {
	return i + Math.floor(i / 2);
}

function end() {
	input.value?.blur();
}

function blur() {
	if (time.value && active.value !== 0) {
		emit("submit", Temporal.PlainTime.from(etime.value));
	}

	active.value = -1;
}

function start() {
	active.value = 0;
}

function setH12(h12u: number) {
	const h12 = Math2.clamp(h12u, 1, 12);
	const h24 = isA.value ? h12 % 12 : (h12 % 12) + 12;
	etime.value = etime.value.with({ hour: h24 });
}

function setMinutes(m: number) {
	const minute = Math2.clamp(m, 0, 59);
	etime.value = etime.value.with({ minute });
}

function setSeconds(s: number) {
	const seconds = Math2.clamp(s, 0, 59);
	etime.value = etime.value.with({ second: seconds });
}

function keypress(kp: KeyboardEvent) {
	if (active.value === -1) return;

	const key = kp.key.toLowerCase();
	const canForwards = time.value && active.value < 6;
	const canBack = active.value > 0;

	if (key === "backspace" && canBack) return active.value--;
	if (key === "arrowleft" && canBack) return active.value--;
	if (key === "arrowright" && canForwards) return active.value++;
	if (key === "enter") return end();

	if (!Math2.bounded(active.value, 0, 6) || key.length !== 1) return;

	if (active.value === 6) {
		if (!/^[ap]$/.test(key)) return;

		const isA = key === "a";
		const h24 = etime.value.hour;

		if (isA && h24 >= 12) etime.value = etime.value.with({ hour: h24 - 12 });
		if (!isA && h24 < 12) etime.value = etime.value.with({ hour: h24 + 12 });

		return end();
	}

	if (!/^\d$/.test(key)) return;
	const num = Number(key);

	const activate = (
		tensLim: number,
		set: (v: number) => void,
		ref: Ref<readonly [number, number]>,
	) => {
		if (active.value % 2 === 0) {
			if (num > tensLim) {
				active.value++;
				set(num);
			} else {
				set(num * 10 + ref.value[1]);
			}
		} else {
			set(ref.value[0] * 10 + num);
		}
	};

	const tensLim = [1, 5, 5][Math.floor(active.value / 2)]!;
	const setter = [setH12, setMinutes, setSeconds][
		Math.floor(active.value / 2)
	]!;
	const ref = [hour, minute, seconds][Math.floor(active.value / 2)]!;

	activate(tensLim, setter, ref);
	active.value++;
}

const timestr = computed(() => {
	const hide = !time.value ? active.value : 7;

	const h1 = hide <= 0 ? "-" : hour.value[0];
	const h2 = hide <= 1 ? "-" : hour.value[1];
	const m1 = hide <= 2 ? "-" : minute.value[0];
	const m2 = hide <= 3 ? "-" : minute.value[1];
	const s1 = hide <= 4 ? "-" : seconds.value[0];
	const s2 = hide <= 5 ? "-" : seconds.value[1];
	const p = hide <= 6 ? "--" : period.value;

	return `${h1}${h2}:${m1}${m2}:${s1}${s2} ${p}`;
});

const iconClass = computed(() => {
	if (color === "red") return "!text-red-400";
	if (color === "green") return "!text-green-400";
	return "!text-sub";
});
</script>

<template>
	<div tabindex="0" class="input" ref="input" @focusin="start" @focusout="blur" @keydown="keypress">
		<Icon :name="icon ?? 'hugeicons:clock-01'" :class="cn('icon', active !== -1 ? 'focused' : '', iconClass)" size="20" />

		<div class="display">
			{{ timestr }}
		
			<div 
				v-for="i in 8" 
				:key="i - 1" 
				:class="cn(
					'line', 
					i !== 8 && active === i - 1 ? 'active' : '',
					active === 6 && i === 8 ? 'active' : ''
				)" 
				:style="{
					left: `${Math2.round(9.6 * placement(i - 1), 1)}px`
				}"
			/>
		</div>
	</div>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.input {
	@apply relative;
	@apply flex flex-row justify-center items-center gap-4;
	@apply bg-card rounded-lg px-6 py-4;
	@apply font-['JetBrains_Mono',monospace]  select-none;
	@apply transition-all duration-200;
}

.display {
	@apply relative;
	@apply cursor-pointer select-none;
}

.icon {
	@apply text-sub;
	@apply transition-colors duration-200;

	&.focused {
		@apply text-white;
	}
}

.underlines {
	@apply absolute;
}

.line {
	@apply absolute top-[24px] h-[1px] w-[9.6px] ;
	@apply border-b-sub border-b border-dotted;
	@apply transition-all duration-200;
	
	&.active {
		@apply border-solid border-white;
	}
}
</style>