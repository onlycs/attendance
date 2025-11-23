<script setup lang="ts">
defineProps<{
    kind:
        | "primary"
        | "background"
        | "card"
        | "card-2"
        | "error"
        | "error-transparent";
    disabled?: boolean;
    static?: boolean;
}>();
</script>

<template>
    <button
        :class="cn(
            'button',
            $props.kind,
            $attrs.class as string | undefined,
            $props.disabled && 'disabled',
            $props.static && 'no-animate',
        )"
        v-bind="$attrs"
        :disabled
    >
        <slot />
    </button>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.button {
    @apply p-3 rounded-lg cursor-pointer;
    @apply transition-all duration-300;

    &:not(.no-animate) {
        @apply active:scale-95;
    }

    &.primary {
        @apply bg-white text-black;
        @apply hover:bg-white/90;

        &:not(.no-animate) {
            @apply active:bg-white/80;
        }

        &.no-animate {
            @apply active:bg-white;
        }
    }

    &.card {
        @apply bg-card hover:bg-card-hover;

        &:not(.no-animate) {
            @apply active:bg-card-active;
        }

        &.no-animate {
            @apply active:bg-card;
        }
    }

    &.card-2 {
        @apply bg-card-2 hover:bg-card-2-hover;

        &:not(.no-animate) {
            @apply active:bg-card-2-active;
        }

        &.no-animate {
            @apply active:bg-card-2;
        }
    }

    &.background {
        @apply bg-background hover:bg-card-active;

        &:not(.no-animate) {
            @apply active:bg-background-dark;
        }

        &.no-animate {
            @apply active:bg-background;
        }
    }

    &.error {
        @apply bg-red-500 text-white;
        @apply hover:bg-red-400;

        &:not(.no-animate) {
            @apply active:bg-red-600;
        }

        &.no-animate {
            @apply active:bg-red-500;
        }
    }

    &.error-transparent {
        @apply bg-red-500/10 text-red-500;
        @apply hover:bg-red-500/30;

        &:not(.no-animate) {
            @apply active:bg-red-500/20;
        }

        &.no-animate {
            @apply active:bg-red-500/10;
        }
    }

    &.disabled {
        @apply opacity-50 cursor-not-allowed;
        @apply active:scale-100;
    }
}
</style>
