<script setup lang="ts">
import type { Icon } from "#components";

const props = defineProps<{
    title: string;
    icon: string;
    customize?: (content: string) => string;
    animate?: boolean;
    showText?: boolean;
}>();

const animate = inject<Ref<boolean>>("animate", ref(props.animate ?? true));
const showText = inject<Ref<boolean>>("showText", ref(props.showText ?? false));

const prim = ref<HTMLDivElement>();
const icon = ref<InstanceType<typeof Icon>>();
const title = ref<HTMLDivElement>();

defineExpose({ prim, icon, title });
</script>

<template>
    <div :class="cn('group/card focus-card', animate && 'animate')" ref="prim">
        <div class="flex justify-center items-center w-full h-full">
            <Icon
                :name="$props.icon"
                class="icon"
                :customize="Customize.StrokeWidth(0.75, $props.customize)"
                mode="svg"
                ref="icon"
            />
        </div>

        <div class="background" />

        <div :class="cn('title', !showText && 'animate')" ref="title">
            {{ $props.title }}
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.focus-card {
    @apply relative overflow-hidden rounded-lg;
    @apply bg-card cursor-pointer;
    @apply size-48 md:size-52 lg:size-58 xl:size-68 2xl:size-84;

    &.animate {
        @apply md:hover:scale-[0.98] md:hover:-translate-y-6;
        @apply duration-200 hover:duration-300;
    }
}

.icon {
    @apply max-md:mb-6;
    @apply size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52;
    @apply z-10;
}

.textbox {
    @apply absolute inset-0 flex items-end;
    @apply py-4 px-5;
}

.bg {
    @apply absolute inset-0 flex items-end;

    @apply md:group-hover/card:bg-drop;
    @apply duration-50 group-hover/card:duration-150;
    @apply transform scale-0 group-hover/card:scale-100 origin-center;
}

.title {
    @apply absolute inset-0 flex items-end;
    @apply py-4 px-5;
    @apply text-lg md:text-xl xl:text-2xl font-[600] select-none;
    @apply z-[1];

    &.animate {
        @apply md:opacity-0 md:group-hover/card:opacity-100;
        @apply duration-200 hover:duration-300;
    }
}
</style>
