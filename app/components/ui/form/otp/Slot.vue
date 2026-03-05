<script setup lang="ts">
import type { SlotProps } from "vue-input-otp";

export type SlotSize = "sm" | "md" | "lg";

export interface OTPSlotProps extends SlotProps {
    hidden?: boolean;
    size?: SlotSize;
    placeholder?: string;
    rect?: boolean;
}

const props = withDefaults(defineProps<OTPSlotProps>(), {
    hidden: false,
    size: "md",
    placeholder: "",
    rect: false,
});

const box = {
    sm: props.rect ? "w-9 h-13" : "size-13",
    md: props.rect ? "w-10 h-14" : "size-14",
    lg: props.rect ? "w-12 h-16" : "size-16",
}[props.size];

const text = {
    sm: "text-md",
    md: "text-lg",
    lg: "text-xl",
}[props.size];
</script>

<template>
    <div :class="cn(box, isActive && 'active', 'slot')">
        <div v-if="char !== null" :class="cn(text, 'char')">
            {{ hidden ? "●" : char }}
        </div>
        <div v-else-if="!isActive" :class="cn(text, 'char text-sub')">
            {{ placeholder }}
        </div>

        <div
            v-if="char === null && isActive"
            :class="cn('caret', $props.size)"
        />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

@keyframes caret-pulse {
    0%,
    100% {
        transform: scaleY(0.85);
    }

    50% {
        transform: scaleY(1);
    }
}

.slot {
    @apply flex items-center justify-center;
    @apply rounded-md border bg-drop;
    @apply transition-all duration-150;

    &.active {
        @apply border-2 border-white;
        @apply duration-100;
    }
}

.caret {
    @apply w-[1px] rounded-full bg-white;
    animation: caret-pulse linear 1000ms infinite;

    &.sm {
        @apply h-5;
    }

    &.md {
        @apply h-6;
    }

    &.lg {
        @apply h-7;
    }
}
</style>
