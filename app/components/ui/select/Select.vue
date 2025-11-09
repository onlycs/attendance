<script setup lang="ts" generic="Options extends Record<string, string>">
defineProps<{
    options: Options;
}>();

const selected = defineModel<keyof Options>("selected", {
    type: String,
    required: true,
});

function select(key: keyof Options) {
    selected.value = key;
}
</script>

<template>
    <div class="select">
        <div
            v-for="([key, label]) in Object.entries($props.options)"
            :key="key"
            :class="cn('option', selected == key && 'selected')"
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
        @apply px-4 py-2 bg-card;
        @apply select-none flex-1 text-center;

        &:first-child {
            @apply rounded-l-lg;
        }

        &:last-child {
            @apply rounded-r-lg;
        }

        &.selected {
            @apply bg-drop;
        }

        &:not(.selected) {
            @apply cursor-pointer;
        }

        &:not(:first-child):not(:last-child) {
            @apply border-x border-border;
        }
    }
}
</style>
