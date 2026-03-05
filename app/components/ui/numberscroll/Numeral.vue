<script setup lang="ts">
const DIGIT_HEIGHT = 36;

const props = defineProps<{ index: number }>();
const digits = inject<Ref<number[]>>("digits")!;
const digit = computed(() => digits.value[props.index] ?? 0);
const inactive = ref(true);
const translate = computed(() => {
    return inactive.value ? 0 : -digit.value * DIGIT_HEIGHT;
});

onMounted(() => setTimeout(() => (inactive.value = false), 10));
</script>

<template>
    <div class="digit">
        <span
            :class="cn('text', inactive && 'inactive')"
            :style="{ transform: `translateY(${translate}px)` }"
        >
            <template v-for="n of 10">
                <br v-if="n != 1" />{{ n - 1 }}
            </template>
        </span>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.digit {
    @apply absolute h-9 text-3xl;
    @apply flex flex-col;
    @apply overflow-y-hidden;
}

.text {
    @apply h-9 w-5;
    @apply transition-all;

    transition:
        transform 0.5s,
        opacity 0.3s;

    &.inactive {
        @apply opacity-0;
    }
}
</style>
