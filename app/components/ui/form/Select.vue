<script setup lang="ts" generic="K extends string | number">
import type { Button } from "#components";

export interface SelectProps<K extends string | number> {
    kv: Record<K, string>;

    class?: string | string[];
    "class:btn"?: string | string[];
    "class:overlay"?: string | string[];
}

const props = defineProps<SelectProps<K>>();
const selected = defineModel<K>("selected", { required: true });
const nth = computed(() => {
    const sel = selected.value ?? Object.keys(props.kv)[0]!;
    return Object.keys(props.kv).indexOf(String(sel));
});

const buttons = ref<InstanceType<typeof Button>[]>([]);
const sliderW = ref(0);
const sliderX = ref(0);

function select(key: K) {
    selected.value = key;
}

onMounted(() => {
    watch([nth, buttons], ([nth, buttons]) => {
        const btn = buttons[nth];
        if (!btn || !btn.button) return;

        sliderW.value = btn.button.offsetWidth;
        sliderX.value = btn.button.offsetLeft - 8;
    }, { immediate: true });

    window.addEventListener("resize", () => {
        const btn = buttons.value[nth.value];
        if (!btn || !btn.button) return;

        sliderW.value = btn.button.offsetWidth;
        sliderX.value = btn.button.offsetLeft - 8;
    });
});
</script>

<template>
    <div :class="cn('select', $props.class)">
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
                transform: `translateX(${sliderX}px)`,
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
        @apply relative z-10 bg-transparent mix-blend-difference;

        &.selected {
            @apply transition-all duration-150;
            @apply cursor-auto;
        }
    }

    .overlay {
        @apply absolute top-2 left-2;
        @apply h-[calc(100%-1rem)] transition-all duration-300;
        @apply bg-white rounded-sm z-0;
    }
}
</style>
