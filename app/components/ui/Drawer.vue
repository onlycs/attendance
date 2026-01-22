<script setup lang="ts">
const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ close: []; }>();

watch(open, (open, old) => {
    if (old && !open) emit("close");
});

defineOptions({ inheritAttrs: false });
</script>

<template>
    <DrawerRoot
        :open
        @close="() => open = false"
        class="root"
        should-scale-background
    >
        <DrawerPortal>
            <DrawerOverlay class="overlay" @click="() => open = false" />

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
    @apply rounded-t-lg;
    @apply bg-card px-4 pb-4;

    .handle {
        @apply mb-6 mt-4;
    }
}
</style>
