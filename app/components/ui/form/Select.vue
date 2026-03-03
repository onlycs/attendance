<script setup lang="ts" generic="K extends PropertyKey">
import type { Button } from "#components";
export interface SelectProps<K extends PropertyKey> {
    kv: Record<K, string>;
    class?: string | string[];
    "class:btn"?: string | string[];
    "class:overlay"?: string | string[];
    rows?: number;
}
const props = withDefaults(defineProps<SelectProps<K>>(), {
    rows: 1,
});
const selected = defineModel<K | null>({
    required: true,
    default: null,
});
const nth = computed(() => {
    const sel = selected.value ?? Object.keys(props.kv)[0]!;
    return Object.keys(props.kv).indexOf(String(sel));
});
const buttons = ref<InstanceType<typeof Button>[]>([]);
const sliderW = ref(0);
const sliderX = ref(0);
const sliderY = ref(0);

// Calculate grid layout
const totalItems = computed(() => Object.keys(props.kv).length);
const itemsPerRow = computed(() => Math.ceil(totalItems.value / props.rows));

function select(key: K) {
    selected.value = key;
}

function updateSliderPosition() {
    const btn = buttons.value[nth.value];
    if (!btn || !btn.button) return;

    sliderW.value = btn.button.offsetWidth;
    sliderX.value = btn.button.offsetLeft - 8;
    sliderY.value = btn.button.offsetTop - 8;
}

const container = ref<HTMLElement>();

onMounted(() => {
    watch([nth, buttons], () => {
        updateSliderPosition();
    }, { immediate: true });

    new ResizeObserver(updateSliderPosition).observe(container.value!);
});

watch(selected, () => {
    if (selected.value === null) {
        const firstKey = Object.keys(props.kv)[0] as K;
        selected.value = firstKey;
    }
}, { immediate: true });
</script>

<template>
    <div
        ref="container"
        :class="cn('select', $props.class)"
        :style="{
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
        }"
    >
        <Button
            v-for="([key, label], i) of Object.entries($props.kv) as [K, string][]"
            :class="cn(
                'option',
                selected === key && 'selected',
                $props['class:btn'],
            )"
            class:active="!rounded-sm"
            class:hover="!rounded-sm"
            class:content="px-4"
            :ref="(el) => {
                if (el) buttons[i] = el as any;
            }"
            :key
            @click="(_: unknown) => select(key)"
        >
            {{ label }}
        </Button>
        <div
            :class="cn('overlay', $props['class:overlay'])"
            :style="{
                width: `${sliderW}px`,
                transform: `translate(${sliderX}px, ${sliderY}px)`,
            }"
        />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";
.select {
    @apply grid w-full h-fit;
    @apply p-2 bg-drop rounded-lg gap-2 relative;

    .option {
        @apply active:scale-100! duration-75! md:h-10 h-12;
        @apply relative z-10 bg-transparent mix-blend-difference;

        &.selected {
            @apply transition-all duration-150;
            @apply cursor-auto;
        }
    }

    .overlay {
        @apply absolute top-2 left-2;
        @apply h-[calc(3rem)] md:h-[calc(2.5rem)] transition-all duration-200;
        @apply bg-white rounded-sm z-0;
    }
}
</style>
