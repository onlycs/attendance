<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { Math2 } from "~/utils/math";
import type { InstantPickerProps } from "./TimePicker.vue";

const { icon, color, background } = defineProps<InstantPickerProps>();
const date = defineModel<Temporal.PlainDate>("date");
const temp = ref(date.value ?? Temporal.Now.plainDateISO());
const emit = defineEmits<{ submit: [Temporal.PlainDate]; }>();
const edate = computed({
    get() {
        return date.value ?? temp.value;
    },
    set(v: Temporal.PlainDate) {
        if (date.value) date.value = v;
        else temp.value = v;
    },
});

const month = computed<[number, number]>(() => {
    const m = edate.value.month;
    return [Math.floor(m / 10), m % 10] as const;
});

const day = computed(() => {
    const d = edate.value.day;
    return [Math.floor(d / 10), d % 10] as const;
});

const year = computed(() => {
    const y = edate.value.year.toString().slice(2);
    return y.padStart(2, "0").split("").map(Number) as [number, number];
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
    if ((date.value || active.value === 6) && active.value !== 0) {
        if (!date.value) date.value = Temporal.PlainDate.from(edate.value);
        emit("submit", Temporal.PlainDate.from(date.value));
    }

    active.value = -1;
}

function start() {
    active.value = 0;
}

function setMonth(m: number) {
    const month = Math2.clamp(m, 1, 12);
    edate.value = edate.value.with({ month });
}

function setDay(d: number) {
    const day = Math2.clamp(d, 1, edate.value.daysInMonth);
    edate.value = edate.value.with({ day });
}

function setYear(y: number) {
    const year = Math2.clamp(y, 0, 99) + 2000;
    edate.value = edate.value.with({ year });
}

function keypress(kp: KeyboardEvent) {
    if (active.value === -1) return;

    const key = kp.key.toLowerCase();
    const canForwards = date.value && active.value < 5;
    const canBack = active.value > 0;

    if (key === "backspace" && canBack) return active.value--;
    if (key === "arrowleft" && canBack) return active.value--;
    if (key === "arrowright" && canForwards) return active.value++;
    if (key === "enter") return end();

    if (!Math2.bounded(active.value, 0, 6) || key.length !== 1) return;

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

    const index = Math.floor(active.value / 2);
    const tensLim = [1, 3, 9][index]!;
    const setter = [setMonth, setDay, setYear][index]!;
    const ref = [month, day, year][index]!;

    activate(tensLim, setter, ref);
    active.value++;

    if (active.value === 6) end();
}

const datestr = computed(() => {
    const hide = !date.value ? active.value : 6;

    const m1 = hide <= 0 ? "-" : month.value[0];
    const m2 = hide <= 1 ? "-" : month.value[1];
    const d1 = hide <= 2 ? "-" : day.value[0];
    const d2 = hide <= 3 ? "-" : day.value[1];
    const y1 = hide <= 4 ? "-" : year.value[0];
    const y2 = hide <= 5 ? "-" : year.value[1];

    return `${m1}${m2}/${d1}${d2}/${y1}${y2}`;
});

const iconClass = computed(() => {
    if (color === "red") return "!text-red-400";
    if (color === "green") return "!text-green-400";
    return "!text-sub";
});
</script>

<template>
    <div
        tabindex="0"
        :class="cn(
            'input',
            $props.background === 'card' ? '!bg-card' : '!bg-background',
        )"
        ref="input"
        @focusin="start"
        @focusout="blur"
        @keydown="keypress"
    >
        <Icon
            :name="icon ?? 'hugeicons:calendar-03'"
            :class="cn('icon', active !== -1 ? 'focused' : '', iconClass)"
            size="20"
        />

        <div class="display">
            {{ datestr }}

            <div
                v-for="i of 6"
                :key="i - 1"
                :class="cn(
                    'line',
                    i !== 7 && active === i - 1 ? 'active' : '',
                )"
                :style="{
                    left: `${
                        Math2.round(9.6 * placement(i - 1), 1)
                    }px`,
                }"
            />
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.input {
    @apply relative;
    @apply flex flex-row justify-center items-center gap-4 flex-1;
    @apply bg-card rounded-lg px-6 py-4;
    @apply font-["JetBrainsMono_Nerd_Font",monospace] select-none;
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
    @apply absolute top-[24px] h-[1px] w-[9.6px];
    @apply border-b-sub border-b border-dotted;
    @apply transition-all duration-200;

    &.active {
        @apply border-solid border-white;
    }
}
</style>
