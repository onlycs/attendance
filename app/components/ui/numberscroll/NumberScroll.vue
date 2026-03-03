<script setup lang="ts">
const props = defineProps<{ value: number }>();
const value = toRef(props, "value");

// digits in REVERSE order [units, tens, hundreds, ...]
const digits = computed(() => {
    const digits = [];
    let v = value.value;

    while (true) {
        digits.push(v % 10);
        if (v < 10) break;
        v = Math.floor(v / 10);
    }

    return digits;
});

// a single 3xl digit is 18x36 in JBM font
const DIGIT_WIDTH = 18;

// for children
provide<Ref<number[]>>("digits", digits);

// to animate this properly, children are going to have to be width: 0
// and manually positioned, so adding/removing digits can be animated
// figure out the full width of the container
const boxW = computed(() => digits.value.length * DIGIT_WIDTH);
</script>

<template>
    <div class="numscroll" :style="{ width: `${boxW}px` }">
        <div
            class="numeral"
            v-for="i of Array(digits.length).keys()"
            :style="{ transform: `translateX(-${(i + 1) * DIGIT_WIDTH}px)` }"
        >
            <Numeral :key="i" :index="i" />
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.numscroll {
    @apply relative h-9;
    @apply flex flex-col items-end;
    @apply transition-all duration-500;
}
</style>
