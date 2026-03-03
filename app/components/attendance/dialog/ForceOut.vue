<script setup lang="ts">
import { toast } from "vue-sonner";

const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ retry: []; cancel: [] }>();

function submit() {
    if (!open.value) return;

    open.value = false;
    emit("retry");
}

function cancel() {
    if (!open.value) return;
    open.value = false;

    toast.warning("Cancelled! You were not signed out!");
    emit("cancel");
}
</script>
<template>
    <Drawer v-model:open="open" @close="cancel">
        <span class="title"><em>Woah</em> there.</span>
        <span class="desc">
            You signed in less than three minutes ago.
            <br />Are you sure about this?
        </span>
        <div class="form">
            <Button @click="submit" kind="danger-card">
                Yes, sign me out!
            </Button>
            <Button @click="cancel" kind="primary">
                No, stay signed in.
            </Button>
        </div>
    </Drawer>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.title {
    @apply mb-2 text-xl md:text-2xl;
}

.desc {
    @apply text-center mt-2;
}

.form {
    @apply mt-8 gap-2 flex flex-col;
    @apply max-md:w-full md:w-[32rem] lg:w-[38rem] max-w-full;
}

.form :deep(.submit) {
    @apply mt-4;
}
</style>
