<script setup lang="ts">
export type InputProps = Partial<HTMLInputElement>;
const value = defineModel<string>();
const focused = defineModel<boolean>("focused", { default: false });
</script>

<template>
    <input
        ref="input"
        class="input"
        autocomplete="off"
        :value
        @input="value = ($event as any).target.value"
        @focusin="focused = true"
        @focusout="focused = false"
    />
</template>

<style scoped>
@reference "~/style/tailwind.css";

.input {
    @apply flex h-fit w-full bg-drop px-6 py-5;
    @apply rounded-md border border-border;
    @apply text-sm placeholder:text-sub;
    @apply transition-all duration-150;

    &:focus-visible {
        @apply border-white;
        box-shadow: 0 0 0 2px white;
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
