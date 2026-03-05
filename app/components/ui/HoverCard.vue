<script setup lang="ts">
import { Math2 } from "~/utils/math";

const open = defineModel<boolean>("open", { required: true });
const mouse = useMouse();

const pos = ref<FixedArray<number, 2>>([0, 0]);
const dragging = ref(false);

const PAD_LEFT = 102;
const PAD_TOP = 30;
const PAD_RIGHT = 128;
const PAD_BOTTOM = 128;
const DRAG_OFFSET = 26;

const CONTENT = lazy(() => document.getElementById("content")!);
const WIDTH = lazy(() => CONTENT.value!.clientWidth - PAD_RIGHT);
const HEIGHT = lazy(() => CONTENT.value!.clientHeight - PAD_BOTTOM);

watch(open, (open) => {
    if (!open) pos.value = [-1000, -1000];
    else pos.value = [mouse.x.value, mouse.y.value];
});

watch([mouse.x, mouse.y], ([x, y]) => {
    if (!dragging.value) return;
    pos.value = [
        Math2.clamp(x, PAD_LEFT, WIDTH.value) + DRAG_OFFSET,
        Math2.clamp(y, PAD_TOP, HEIGHT.value) + DRAG_OFFSET,
    ];
});

function mdown() {
    dragging.value = true;
}

function mup() {
    dragging.value = false;
}

onMounted(() => {
    window.addEventListener("mouseup", mup);
});
onUnmounted(() => {
    window.removeEventListener("mouseup", mup);
});
</script>

<template>
    <div
        :class="cn('card', open && 'open', dragging && 'dragging')"
        :style="{ left: `${pos[0]}px`, top: `${pos[1]}px` }"
        ref="card"
    >
        <slot />

        <div class="drag-container" @mousedown.prevent="mdown">
            <Icon name="hugeicons:move" class="drag" size="20" />
        </div>

        <div class="close-container" @click="open = false">
            <Icon name="hugeicons:cancel-01" class="close" size="20" />
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.card {
    @apply fixed -top-full -left-full opacity-0;
    @apply z-50;

    &.open {
        @apply opacity-100;
    }

    &.dragging {
        @apply opacity-80;
    }
}

.drag-container {
    @apply absolute -top-11 -left-11 p-2;
    @apply flex items-center justify-center;
    @apply rounded-lg border border-border bg-drop;
    @apply cursor-move;
}

.close-container {
    @apply absolute -top-0 -left-11 p-2;
    @apply flex items-center justify-center;
    @apply rounded-lg border border-border bg-drop;
    @apply cursor-pointer;
}

.drag {
    @apply text-sub;
}

.close {
    @apply text-red-500;
}
</style>
