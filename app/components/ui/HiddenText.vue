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
    @apply flex flex-col gap-2 justify-center items-center;
    @apply w-full h-full;
}

.icon {
    @apply size-12 text-sub;
}

.desc {
    @apply h-0 opacity-0 text-sm text-center text-sub select-none;
    @apply group-hover/hidable:h-6 group-hover/hidable:opacity-100;
    @apply transition-all duration-200 group-hover/hidable:duration-300;
}
</style>
