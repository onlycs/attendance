<script setup lang="ts" generic="O extends Record<string, string>">
export interface SelectProps<O extends Record<string, string>> {
    options: O;
    background?: "card" | "bg";
}

defineProps<SelectProps<O>>();

const selected = defineModel<keyof O>("selected", {
    type: String,
    required: true,
});

function select(key: keyof O) {
    selected.value = key;
}
</script>

<template>
    <div class="select">
        <div
            v-for="([key, label]) of Object.entries($props.options)"
            :key
            :class="cn(
                'option',
                background === 'bg' ? 'bg-background' : 'bg-card',
                selected == key && 'selected',
            )"
            @click="select(key)"
        >
            {{ label }}
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.select {
    @apply flex flex-row w-full;

    .option {
        @apply px-4 py-2;
        @apply select-none flex-1 text-center;

        &:first-child {
            @apply rounded-l-lg;
        }

        &:last-child {
            @apply rounded-r-lg;
        }

        &.selected.bg-card {
            @apply !bg-drop;
        }

        &.selected.bg-background {
            @apply !bg-card-hover;
        }

        &:not(.selected) {
            @apply cursor-pointer;
        }

        &:not(:first-child) {
            @apply border-l border-border;
        }
    }
}
</style>
