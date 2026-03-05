<script setup lang="ts">
import { Temporal } from "temporal-polyfill";

export interface InstantPickerProps {
    icon?: string;
    color?: "red" | "green" | "gray";
}

const props = withDefaults(defineProps<InstantPickerProps>(), {
    icon: "hugeicons:clock-01",
    color: "gray",
    background: "bg",
});

const DIGITS = 4;
const SLOTS = 5; // AM/PM
type DIGITS = typeof DIGITS;
type SLOTS = typeof SLOTS;

const ptime = defineModel<Temporal.PlainTime | null>({ default: null });
const ttime = ref(ptime.value ?? Temporal.PlainTime.from("00:00:00"));
const vis = ref(ptime.value ? SLOTS : 0);

const time = computed({
    get: () => ptime.value ?? ttime.value,
    set: (v) => {
        if (vis.value >= SLOTS) ptime.value = v;
        else ttime.value = v;
    },
});

watch(ptime, (ptime) => {
    if (!ptime) {
        vis.value = 0;
        ttime.value = Temporal.PlainTime.from("00:00:00");
    }
});

function digit(
    getter: () => number,
    setter: (n: number) => void,
    place: number,
) {
    return computedWithControl([time], {
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

function to12(hour24: number) {
    return ((hour24 + 11) % 12) + 1;
}

function auto24(hour12: number, isP?: boolean) {
    const current24 = time.value.hour;
    const isPM = isP === undefined ? current24 >= 12 : isP;
    if (isPM) return (hour12 % 12) + 12;
    else return hour12 % 12;
}

function fix(hr: number) {
    if (hr % 10 > 2 && hr > 10) {
        if (active.value === 0) return 10;
        return hr % 10;
    }
    return hr;
}

const digits = [
    ...alldigits(
        () => to12(time.value.hour),
        (hour) => {
            time.value = time.value.with({ hour: auto24(fix(hour)) });
        },
        2,
    ),
    ...alldigits(
        () => time.value.minute,
        (minute) => {
            time.value = time.value.with({ minute });
        },
        2,
    ),
] as FixedArray<Ref<number>, DIGITS>;

const isP = computedWithControl([time], {
    get: () => time.value.hour >= 12,
    set: (v) => {
        const hour12 = to12(time.value.hour);
        time.value = time.value.with({ hour: auto24(hour12, v) });
    },
});

const max = [
    1,
    computed(() => (digits[0].value === 1 ? 2 : 9)),
    5,
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

    // if on hour ones, and we hit ":" or "."
    if ([".", ":"].includes(key) && current === 1) {
        // move tens to ones, and 0 to tens
        const prev = digits[current - 1]!.value;
        if (prev === 0) return; // neither day nor month can be == 0

        digits[current]!.value = prev;
        setTimeout(() => (digits[current - 1]!.value = 0), 0); // race condition in setters? who tf knows
        active.value++;
        vis.value = Math.max(vis.value, active.value);
        return;
    }

    // if on AP/PM slot and we hit A/P
    if (["a", "p"].includes(key) && current === 4) {
        isP.value = key === "p";
        active.value++;
        vis.value = Math.max(vis.value, active.value);
        return;
    }

    if (!/^\d$/.test(key)) return;
    const num = Number(key);

    if (num > unref(max[active.value]!) && current % 2 === 0) {
        setTimeout(() => (digits[current]!.value = 0), 0);
        active.value++;
    }

    digits[active.value]!.value = num;
    active.value++;
    vis.value = Math.max(vis.value, active.value);
}

const timestr = computed(() => {
    const display = (n: number) => {
        const sep = n === 1 ? ":" : n === 3 ? "\u2009" : "";
        return narrow([n >= vis.value ? "-" : String(digits[n]!.value), sep]);
    };

    return [
        ...Array.from({ length: DIGITS }, (_, i) => display(i)),
        SLOTS - 1 >= vis.value
            ? narrow(["--", ""])
            : narrow([isP.value ? "PM" : "AM", ""]),
    ];
});

watch(vis, (vis, old) => {
    if (vis === SLOTS && old < SLOTS) {
        ptime.value = ttime.value;
    }
});

watch(active, (active) => {
    if (active >= SLOTS) end();
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
            <template v-for="([n, sep], i) of timestr">
                <span
                    :class="cn('text sel', i == active && 'active')"
                    @click="start(i)"
                >
                    {{ n }}
                </span>
                <span v-if="sep !== ''" class="text">{{ sep }}</span>
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
    @apply flex flex-row gap-1;
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
