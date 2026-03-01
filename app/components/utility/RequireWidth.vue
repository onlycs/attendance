<script setup lang="ts">
const props = defineProps<{ width: number; class?: string | string[]; }>();

const ok = ref(true);
const root = ref<HTMLDivElement>();
const rs = new ResizeObserver(() => {
    if (root.value) {
        ok.value = root.value.clientWidth >= props.width;
    }
});

onMounted(() => {
    if (root.value) {
        rs.observe(root.value);
    }
});

onBeforeUnmount(() => {
    rs.disconnect();
});
</script>

<template>
    <div
        ref="root"
        :class="cn(ok ? 'root' : 'middle group/middle')"
    >
        <div
            :class="cn(
                'w-full h-full',
                $props.class,
            )"
            v-show="ok"
            v-bind="$attrs"
        >
            <slot />
        </div>
        <template v-if="!ok">
            <Icon name="hugeicons:maximize-screen" class="icon" />
            <span class="desc">
                Window too narrow. Please widen or
                <br /> maximize the window to view this content.
            </span>
        </template>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.root {
    @apply w-full h-full;
}

.middle {
    @apply flex flex-col gap-2 justify-center items-center;
    @apply w-full h-full;
}

.icon {
    @apply w-12 h-12 text-sub;
}

.desc {
    @apply h-0 opacity-0 text-sm text-center text-sub select-none;
    @apply group-hover/middle:h-6 group-hover/middle:opacity-100;
    @apply transition-all duration-200 group-hover/middle:duration-300;
}
</style>
