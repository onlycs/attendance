<script setup lang="ts">
export interface DialogProps {
    /** Whether the dialog should display a close button */
    xButton: boolean;
    /** Whether the dialog should close when the Escape key is pressed */
    escape: boolean;
    /** Whether the dialog should close when the overlay is clicked */
    overlayClick: boolean;
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

<template></template>
