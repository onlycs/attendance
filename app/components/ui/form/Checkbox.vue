<script setup lang="ts">
export interface CheckboxProps {
    label?: string;
}

const { label } = defineProps<CheckboxProps>();
const checked = defineModel<boolean | null>({ default: null });

function onchange(event: Event) {
    checked.value = (event.target as HTMLInputElement).checked;
}

watch(
    checked,
    (next) => {
        if (!next && typeof next !== "boolean") checked.value = false;
    },
    { immediate: true },
);
</script>

<template>
    <label class="wrapper">
        <input
            type="checkbox"
            class="input"
            :checked="checked ?? false"
            @change="onchange"
        />

        <span :class="cn('box', checked && 'checked')">
            <svg
                class="checkmark"
                viewBox="0 0 14 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    :class="cn('checkmark-path', checked && 'checked')"
                    d="M1 5.5L5 9.5L13 1"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </span>

        <span v-if="label" class="checkbox-label">{{ label }}</span>
    </label>
</template>
<style scoped>
@reference "~/style/tailwind.css";

.wrapper {
    @apply inline-flex cursor-pointer items-center gap-2.5 select-none;
}

.input {
    @apply pointer-events-none absolute size-0 opacity-0;
}

.box {
    @apply relative size-6;
    @apply rounded-md border-2 bg-drop;
    @apply flex items-center justify-center;
    @apply transition-all duration-200;
}

.box.checked {
    @apply border-transparent bg-white;
}

.checkmark {
    @apply absolute inset-0 box-border size-full p-1 text-drop;
}

.checkmark-path {
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
    transition: stroke-dashoffset 0.25s 0.05s;
}

.checkmark-path.checked {
    stroke-dashoffset: 0;
}
</style>
