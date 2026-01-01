<script setup lang="ts">
import { Draggable } from "gsap/all";
import { Math2 } from "~/utils/math";

const ANIMATE_IN_Y = 64;

const open = defineModel("open", {
    type: Boolean,
    default: false,
});

const { $gsap } = useNuxtApp();
const mouse = useMouse();

const pos = ref([0, 0] as [number, number]);
const card = ref<HTMLDivElement>();
const dragging = ref(false);

const DRAG_W_MAX = new Lazy(
    () => document.getElementById("content")!.clientWidth - 48,
);
const DRAG_H_MAX = new Lazy(
    () => document.getElementById("content")!.clientHeight - 48,
);

watch(open, (isOpen) => {
    if (!isOpen) {
        if (!card.value) return;

        $gsap
            .timeline()
            .to(card.value, {
                top: pos.value[1] - ANIMATE_IN_Y,
                opacity: 0,
                ...Timing.fast.out,
            })
            .set(card.value!, {
                left: "-100%",
                top: "-100%",
            });
    } else {
        pos.value = [mouse.x.value, mouse.y.value];
    }
});

watch(pos, (position) => {
    if (!card.value) return;

    if (!dragging.value) {
        $gsap.set(card.value, {
            opacity: 0,
            left: position[0],
            top: position[1] - ANIMATE_IN_Y,
        });

        $gsap.to(card.value, {
            top: position[1],
            opacity: 1,
            ...Timing.fast.in,
        });
    } else {
        $gsap.set(card.value, {
            left: position[0],
            top: position[1],
        });
    }
});

function update() {
    pos.value = [mouse.x.value, mouse.y.value];
}

function dragClick(down: boolean) {
    dragging.value = down;
    $gsap.to(card.value!, { opacity: 0.75, ...Timing.in });
}

onMounted(() => {
    window.addEventListener("mousemove", (ev) => {
        if (!dragging.value) return;
        pos.value = [
            Math2.clamp(ev.clientX, 32, DRAG_W_MAX.value) + 14,
            Math2.clamp(ev.clientY, 32, DRAG_H_MAX.value) + 14,
        ];
    });

    window.addEventListener("mouseup", () => {
        if (!dragging.value) return;
        dragging.value = false;
        $gsap.to(card.value!, { opacity: 1, ...Timing.out });
    });
});

defineExpose({ update });
</script>

<template>
    <div class="card" ref="card" v-bind="$attrs">
        <slot />

        <div
            class="drag-container"
            ref="drag"
            @mousedown.prevent="(ev) => dragClick(true)"
        >
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
}

.drag-container {
    @apply absolute -top-11 -left-11 p-2;
    @apply flex items-center justify-center;
    @apply rounded-lg bg-drop border border-border;
    @apply cursor-move;
}

.close-container {
    @apply absolute -top-0 -left-11 p-2;
    @apply flex items-center justify-center;
    @apply rounded-lg bg-drop border border-border;
    @apply cursor-pointer;
}

.drag {
    @apply text-sub;
}

.close {
    @apply text-red-500;
}
</style>
