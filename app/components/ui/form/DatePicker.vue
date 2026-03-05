<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import type { InstantPickerProps } from "./TimePicker.vue";

export interface DatePickerProps extends InstantPickerProps {
    omitYear?: boolean;
}

const props = withDefaults(defineProps<DatePickerProps>(), {
    icon: "hugeicons:calendar-03",
    color: "gray",
    background: "bg",
    omitYear: false,
});

const DIGITS = 8;
const DIGITS_VISIBLE = props.omitYear ? 4 : DIGITS;
type DIGITS = typeof DIGITS;

const pdate = defineModel<Temporal.PlainDate | null>({ default: null });
const tdate = ref(pdate.value ?? Temporal.PlainDate.from("1972-01-01")); // would have done 1970 but need leap year or temporal clamps
const vis = ref(pdate.value ? DIGITS_VISIBLE : 0);

const date = computed({
    get: () => pdate.value ?? tdate.value,
    set: (v) => {
        if (vis.value >= DIGITS_VISIBLE) pdate.value = v;
        else tdate.value = v;
    },
});

watch(pdate, (pdate) => {
    if (!pdate) {
        vis.value = 0;
        tdate.value = Temporal.PlainDate.from("1972-01-01");
    }
});

function digit(
    getter: () => number,
    setter: (n: number) => void,
    place: number,
) {
    return computedWithControl([date], {
        get: () => Math.floor(getter() / 10 ** place) % 10,
        set: (v) => {
            const cur = Math.floor(getter() / 10 ** place) % 10;
            setter(getter() + (v - cur) * 10 ** place);
        },
    });
}

function alldigits<N extends number>(
    getter: () => number,
    setter: (n: number) => void,
    places: N,
): FixedArray<Ref<number>, N> {
    return Array.from({ length: places }, (_, i) =>
        digit(getter, setter, places - i - 1),
    ) as FixedArray<Ref<number>, N>;
}

/// Ensure year is a leap year if not fully visible
function visyear(year: number, add = false) {
    const tens = (n: number) => Math.floor(n / 10);

    const skipVis = vis.value + 1 >= DIGITS; // skip if year visible
    const force =
        date.value.month === 2 && active.value === 3 && digits[2].value === 2; // force if editing feb 2X

    if (skipVis && !force) return year;
    if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) return year;

    // note: this function will return, eventually. each decade has >= 2 leap years
    if (add || tens(year - 1) !== tens(year)) return visyear(year + 1, true);
    return visyear(year - 1);
}

const digits = [
    ...alldigits(
        () => date.value.month,
        (month) => {
            date.value = date.value.with({
                month,
                year: visyear(date.value.year),
            });
        },
        2,
    ),
    ...alldigits(
        () => date.value.day,
        (day) => {
            date.value = date.value.with({
                day,
                year: visyear(date.value.year),
            });
        },
        2,
    ),
    ...alldigits(
        () => date.value.year,
        (year) => (date.value = date.value.with({ year: visyear(year) })),
        4,
    ),
] as FixedArray<Ref<number>, DIGITS>;

const max = [
    1,
    9,
    computed(() => (date.value.month === 2 ? 2 : 3)), // no day 3x for feb
    9,
    9,
    9,
    9,
    9,
] as FixedArray<MaybeRef<number>, DIGITS>;

const active = ref(-1);
const hidden = ref<HTMLInputElement>();

function start(n: number) {
    hidden.value?.focus();
    active.value = Math.min(n, vis.value);
}

function end() {
    hidden.value?.blur();
}

function blur() {
    active.value = -1;
}

function focus() {
    if (active.value === -1) start(0);
}

function keypress(kp: KeyboardEvent) {
    const current = active.value;

    if (current === -1) return;

    const key = kp.key.toLowerCase();
    const canForwards = current < vis.value;
    const canBack = current > 0;

    if (key === "backspace" && canBack) return active.value--;
    if (key === "arrowleft" && canBack) return active.value--;
    if (key === "arrowright" && canForwards) return active.value++;
    if (key === "enter") return end();

    // if on day/month ones, and we hit "/"
    if (key === "/" && current % 2 === 1 && current < 4) {
        // move tens to ones, and 0 to tens
        const prev = digits[current - 1]!.value;
        if (prev === 0) return; // neither day nor month can be == 0

        digits[current]!.value = prev;
        setTimeout(() => (digits[current - 1]!.value = 0), 0); // race condition in setters? who tf knows
        active.value++;
        vis.value = Math.max(vis.value, active.value);
        return;
    }

    if (!/^\d$/.test(key)) return;
    const num = Number(key);

    if (num > unref(max[active.value]!)) {
        const cur = active.value;
        setTimeout(() => (digits[cur]!.value = 0), 0);
        active.value++;
    }

    digits[active.value]!.value = num;
    active.value++;
    vis.value = Math.max(vis.value, active.value);
}

const datestr = computed(() => {
    const display = (n: number) => {
        const sep = [1, 3].includes(n);
        return narrow([n >= vis.value ? "-" : String(digits[n]!.value), sep]);
    };

    return Array.from({ length: DIGITS_VISIBLE }, (_, i) => display(i));
});

watch(vis, (vis, old) => {
    if (vis === DIGITS_VISIBLE && old < DIGITS_VISIBLE) {
        pdate.value = tdate.value;
    }
});

watch(active, (active) => {
    if (active >= DIGITS_VISIBLE) end();
});
</script>

<template>
    <div
        class="input"
        tabindex="0"
        @focusin="focus"
        @focusout="blur"
        @keydown="keypress"
    >
        <input
            ref="hidden"
            class="hidden-input"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
        />

        <Icon
            :name="icon"
            :class="cn('icon', props.color, active !== -1 ? 'focused' : '')"
            size="24"
        />

        <div class="display">
            <template v-for="([n, sep], i) of datestr">
                <span
                    :class="cn('text sel', i == active && 'active')"
                    @click="start(i)"
                >
                    {{ n }}
                </span>
                <span v-if="sep" class="text">/</span>
            </template>
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.input {
    @apply relative;
    @apply flex flex-row items-center justify-center;
    @apply rounded-lg bg-drop p-3 pl-0.5;
    @apply select-none;
    @apply transition-all duration-150;
}

.display {
    @apply relative flex flex-row gap-1;
    @apply select-none;
}

.text {
    @apply py-1 text-lg;
    @apply transition-all duration-150;

    &.sel {
        @apply rounded-xs border px-1.5;
        @apply duration-100;

        &.active {
            @apply border-white;
        }
    }
}

.icon {
    @apply transition-colors duration-200;
    @apply mx-4;

    &.red {
        @apply text-red-400;

        &.focused {
            @apply text-red-300;
        }
    }

    &.green {
        @apply text-green-400;

        &.focused {
            @apply text-green-300;
        }
    }

    &.gray {
        @apply text-sub;

        &.focused {
            @apply text-text;
        }
    }
}

.hidden-input {
    @apply absolute h-1 w-1;
    @apply opacity-0;

    &:focus {
        @apply outline-none;
    }
}
</style>
