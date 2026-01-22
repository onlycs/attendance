<script setup lang="ts">
export type ButtonVariant =
    | "primary"
    | "secondary"
    | "secondary-card"
    | "danger"
    | "danger-card"
    | "warning"
    | "none";

export interface ButtonProps {
    disabled?: boolean;
    form?: "submit" | "cancel" | "reset";
    kind?: ButtonVariant;

    class?: string | string[];
    "class:hover"?: string | string[];
    "class:active"?: string | string[];
    "class:content"?: string | string[];
}

const button = ref<HTMLButtonElement | null>(null);
const hover = ref<HTMLDivElement | null>(null);
const active = ref<HTMLDivElement | null>(null);
const content = ref<HTMLDivElement | null>(null);

defineProps<ButtonProps>();

defineExpose({
    button,
    hover,
    active,
    content,
});
</script>

<template>
    <button
        ref="button"
        :class="cn(
            'button group/button',
            $props.class,
            $props.disabled && 'disabled',
            $props.kind ?? undefined,
        )"
        v-bind="$attrs"
        :disabled
    >
        <div ref="hover" :class="cn('hover', $props['class:hover'])" />
        <div ref="active" :class="cn('active', $props['class:active'])" />
        <div ref="content" :class="cn('content', $props['class:content'])">
            <slot />
        </div>
    </button>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.button {
    @apply relative md:h-12 h-14;
    @apply w-full rounded-md p-2;
    @apply cursor-pointer;
    @apply active:scale-95 active:duration-300;
    @apply transition-all duration-200;

    &.disabled {
        @apply opacity-50 cursor-not-allowed;
        @apply active:scale-100;
    }

    &.primary {
        @apply bg-white text-black;
    }

    &.secondary {
        @apply bg-card text-text;
    }

    &.secondary-card {
        @apply bg-card-2 text-text;
    }

    &.danger {
        @apply bg-red-500/10 text-red-500;
    }

    &.danger-card {
        @apply bg-red-500/20 text-red-500;
    }

    &.warning {
        @apply bg-yellow-500/10 text-yellow-500;
    }

    .hover {
        @apply absolute inset-0 rounded-md bg-transparent;
        @apply transition-all duration-200;
        @apply group-hover/button:duration-300 group-hover/button:bg-white/5;
    }

    .active {
        @apply absolute inset-0 rounded-md bg-transparent;
        @apply transition-all duration-200;
        @apply group-active/button:duration-300 group-active/button:bg-black/20;
    }

    .content {
        @apply z-10 relative;
        @apply flex flex-row items-center justify-center;
    }
}
</style>
