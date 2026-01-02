<script setup lang="ts">
import type { HTMLAttributes } from "vue";

export type InputProps = Partial<HTMLInputElement>;

const value = defineModel<string>();
</script>

<template>
    <input
        ref="input"
        class="input"
        autocomplete="off"
        @input="(ev) => (value = (ev.target as HTMLInputElement).value)"
    />
</template>

<style scoped>
@reference "~/style/tailwind.css";

.input {
    @apply flex h-16 w-full bg-drop px-6 py-2;
    @apply rounded-md border border-border;
    @apply text-sm placeholder:text-sub;
    @apply transition-all duration-150;

    &:focus-visible {
        @apply border-white border-2;
        @apply outline-none ring-0;
        @apply duration-100;
    }

    @apply disabled:cursor-not-allowed disabled:opacity-50;

    &[type="password"] {
        letter-spacing: 0.3rem;
        &::placeholder {
            letter-spacing: normal;
        }
    }
}
</style>
