<script setup lang="ts">
import type { SlotProps } from "vue-input-otp";

export type SlotSize = "sm" | "md" | "lg";

const props = defineProps<
	SlotProps & {
		hidden?: boolean;
		size?: SlotSize;
	}
>();

const box = {
	sm: "max-md:size-7 size-9",
	md: "max-md:size-9 size-12",
	lg: "max-md:size-12 size-16",
}[props.size ?? "md"];

const text = {
	sm: "max-md:text-sm text-md",
	md: "max-md:text-md text-lg",
	lg: "max-md:text-lg text-xl",
}[props.size ?? "md"];
</script>

<template>
    <div
        :class="
            cn(
                'relative flex items-center justify-center',
                box,
                text,
                'transition-all duration-300',
                'border-border border-y border-r first:border-l first:rounded-l-md last:rounded-r-md',
                { 'outline-4 outline-accent-foreground': isActive },
            )
        "
    >
        <div v-if="char !== null">
            {{ hidden ? "●" : char }}
        </div>

        <div
            v-if="char === null && isActive"
            class="absolute pointer-events-none inset-0 flex items-center justify-center animate-caret-blink"
        >
            <div class="w-px h-8 bg-white" />
        </div>
    </div>
</template>
