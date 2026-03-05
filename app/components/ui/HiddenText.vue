<script setup lang="ts">
const { icon } = defineProps<{ icon: string }>();
</script>

<template>
    <div class="group/hidable hidable">
        <Icon :name="icon" class="icon" />
        <span class="desc">
            <slot />
        </span>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.hidable {
    @apply flex flex-col items-center justify-center gap-2;
    @apply h-full w-full;
}

.icon {
    @apply size-12 text-sub;
}

.desc {
    @apply h-0 text-center text-sm text-sub opacity-0 select-none;
    @apply group-hover/hidable:h-6 group-hover/hidable:opacity-100;
    @apply transition-all duration-200 group-hover/hidable:duration-300;
}
</style>
