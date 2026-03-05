<script setup lang="ts">
const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ close: [] }>();

onMounted(() => {
    const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") open.value = false;
    };

    window.addEventListener("keydown", handler);
    useCleanup().add(() => window.removeEventListener("keydown", handler));
});

defineOptions({ inheritAttrs: false });
</script>

<template>
    <DrawerRoot
        :open
        @close="
            () => {
                if (open) {
                    open = false;
                    emit('close');
                }
            }
        "
        class="root"
        should-scale-background
    >
        <DrawerPortal>
            <DrawerOverlay
                class="overlay"
                @click="
                    () => {
                        if (open) {
                            open = false;
                            emit('close');
                        }
                    }
                "
            />

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
    @apply fixed right-0 bottom-0 left-0;
    @apply z-50 flex flex-col items-center;
    @apply rounded-t-lg;
    @apply bg-card px-4 pb-7;

    .handle {
        @apply mt-4 mb-6;
    }
}
</style>
