<script setup lang="ts" generic="K extends string | number">
export interface SelectProps<K extends string | number> {
    kv: Record<K, string>;
    default: K;

    class?: string | string[];
    "class:btn"?: string | string[];
    "class:overlay"?: string | string[];
}

const props = defineProps<SelectProps<K>>();
const selected = defineModel<K>("selected", { required: true });
const nth = ref(0);

// attempt to find the width of one button.
const selectW = "(100% - 0.5rem)";
// number of elements
const n = Object.keys(props.kv).length;
// total width + gap
const totalW = `(${selectW} / ${n})`;
// actual width of overlay
const buttonW = `${totalW} - 0.5rem`;

function select(key: K) {
    selected.value = key;
    nth.value = Object.keys(props.kv).indexOf(key as any);
}

onMounted(() => {
    select(props.default);
});
</script>

<template>
    <div :class="cn('select', $props.class)">
        <Button
            v-for="([key, label]) of Object.entries($props.kv) as [K, string][]"
            :class="cn(
                'option',
                selected === key && 'selected',
                $props['class:btn'],
            )"
            class:active="rounded-md"
            class:hover="rounded-md"
            :key
            @click="(_: unknown) => select(key)"
        >
            {{ label }}
        </Button>

        <div
            class="overlay"
            :style="{
                width: `calc(${buttonW})`,
                transform: `translateX(calc(${nth}*(100% + 0.5rem))`,
            }"
        />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.select {
    @apply flex flex-row w-full h-fit justify-around items-center;
    @apply p-2 bg-drop rounded-lg gap-2 relative;

    .option {
        @apply active:scale-100! duration-75! md:h-10 h-12;

        &.selected {
            @apply bg-transparent! text-black!;
            @apply transition-all duration-150;
            @apply cursor-auto;
        }
    }

    .overlay {
        @apply absolute top-2 left-2;
        @apply h-[calc(100%-1rem)] transition-all duration-300;
        @apply bg-white rounded-md;
    }
}
</style>
