<script setup lang="ts">
defineProps<{ open: boolean; }>();
defineEmits<{ close: []; }>();

defineOptions({ inheritAttrs: false });
</script>

<template>
    <DrawerRoot
        :open="$props.open"
        @close="() => $emit('close')"
        class="root"
        should-scale-background
    >
        <DrawerPortal>
            <DrawerOverlay class="overlay" @click="() => $emit('close')" />

            <DrawerContent class="dialog" v-bind="$attrs">
                <DrawerHandle class="handle" />
                <slot />
            </DrawerContent>
        </DrawerPortal>
    </DrawerRoot>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.root {
    @apply absolute;
}

.dialog {
    @apply fixed bottom-0 right-0 left-0;
    @apply flex flex-col items-center z-50;
    @apply rounded-t-lg pb-8;
    @apply bg-card;

    .handle {
        @apply mb-6 mt-4;
    }
}
</style>
