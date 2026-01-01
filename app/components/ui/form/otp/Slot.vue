<script setup lang="ts">
import type { SlotProps } from "vue-input-otp";

export type SlotSize = "sm" | "md" | "lg";

export interface OTPSlotProps extends SlotProps {
    hidden?: boolean;
    size?: SlotSize;
}

const props = defineProps<OTPSlotProps>();

const box = {
    sm: "size-12",
    md: "size-14",
    lg: "size-16",
}[props.size ?? "md"];

const text = {
    sm: "text-md",
    md: "text-lg",
    lg: "text-xl",
}[props.size ?? "md"];
</script>

<template>
    <div :class="cn(box, isActive && 'active', 'slot')">
        <div v-if="char !== null" :class="cn(text, 'char')">
            {{ hidden ? "●" : char }}
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
    0%, 100% {
        transform: scaleY(0.85);
    }

    50% {
        transform: scaleY(1.0);
    }
}

.slot {
    @apply flex items-center justify-center;
    @apply bg-drop rounded-md border;
    @apply transition-all duration-150;

    &.active {
        @apply border-white border-2;
        @apply duration-100;
    }
}

.caret {
    @apply rounded-full w-[1px] bg-white;
    animation: caret-pulse linear 1000ms infinite;

    &.sm {
        @apply h-4;
    }

    &.md {
        @apply h-6;
    }

    &.lg {
        @apply h-8;
    }
}
</style>
