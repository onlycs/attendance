<script setup lang="ts">
export interface DialogProps {
    /** Whether the dialog should display a close button */
    xButton?: boolean;
    /** Whether the dialog should close when the Escape key is pressed */
    escape?: boolean;
    /** Whether the dialog should close when the overlay is clicked */
    overlayClick?: boolean;
}

const open = defineModel<boolean>("open", { required: true });
const props = withDefaults(defineProps<DialogProps>(), {
    xButton: true,
    escape: true,
    overlayClick: true,
});
const emit = defineEmits<{ close: []; }>();

onMounted(() => {
    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && props.escape) open.value = false;
    };

    window.addEventListener("keydown", onKeydown);
    useCleanup().add(() => window.removeEventListener("keydown", onKeydown));
});

watch(open, (val) => {
    if (!val) emit("close");
});
</script>

<template>
    <Transition name="fade">
        <div
            class="overlay"
            v-show="open"
            @click.self="open = !props.overlayClick"
        >
            <div class="dialog">
                <div class="header">
                    <div class="title">
                        <slot name="title" />
                    </div>
                    <Button
                        v-if="props.xButton"
                        class="close"
                        kind="danger"
                        @click="open = false"
                    >
                        <Icon name="hugeicons:cancel-01" size="20" />
                    </Button>
                </div>

                <div class="body">
                    <slot />
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.overlay {
    @apply fixed inset-0 z-50;
    @apply flex justify-center items-center;
    @apply bg-black/10 backdrop-blur-xs;
    @apply cursor-pointer;
}

.dialog {
    @apply bg-background rounded-lg p-4;
    @apply flex flex-col gap-4;
    @apply w-full max-w-2xl;
    @apply cursor-default;
}

.header {
    @apply flex justify-between items-center;

    .title {
        @apply ml-2 select-none;
    }

    .close {
        @apply w-fit h-fit;
    }
}

.body {
    @apply flex flex-col justify-center items-center;
    @apply w-full gap-4;
}

.fade-enter-active,
.fade-leave-active {
    @apply transition-opacity duration-150;
}

.fade-enter-from,
.fade-leave-to {
    @apply opacity-0;
}

.fade-enter-to,
.fade-leave-from {
    @apply opacity-100;
}
</style>
