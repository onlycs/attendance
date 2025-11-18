<script setup lang="ts">
import type { Input } from "#components";
import { Fzf } from "fzf";

export interface ComboboxProps {
    options: { [key: string]: string; };
}

const props = defineProps<ComboboxProps>();
const selected = defineModel<string>();

const container = ref<HTMLDivElement>();
const inputbox = ref<InstanceType<typeof Input>>();
const active = computed(() => inputbox.value?.active);

const reversed = computed(() => {
    return Object.fromEntries(
        Object.entries(props.options).map(([k, v]) => [v, k]),
    );
});
const items = computed(() => Object.values(props.options));

const indisplay = ref("");
const keyselect = ref(-1);

const fzf = computed(() => new Fzf(items.value));
const fzfin = ref("");
const fzfout = ref(items.value);

watch([fzf, fzfin], ([fzf, fzfin]) => {
    fzfout.value = fzf.find(fzfin).map((res) => res.item);
});

watch(keyselect, (keyselect) => {
    const key = fzfout.value[keyselect];
    selected.value = reversed.value[key ?? -1];
    if (key) indisplay.value = key;
});

watch(keyselect, (keyselect) => {
    if (keyselect === -1) return;

    const cntr = container.value;
    const item = cntr?.querySelectorAll(".item")[keyselect] as HTMLElement;
    if (!item || !cntr) return;

    item.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

watch(keyselect, (keyselect) => {
    if (keyselect === -1 && fzfin.value) {
        indisplay.value = fzfin.value;
    }
});

function prev() {
    keyselect.value = Math.max(keyselect.value - 1, -1);
}

function next() {
    keyselect.value = Math.min(keyselect.value + 1, fzfout.value.length - 1);
}

function select(index?: number) {
    inputbox.value?.blur();

    if (index && typeof index === "number") keyselect.value = index;
    if (fzfout.value.length === 0) return;
    if (fzfin.value) keyselect.value = Math.max(0, keyselect.value);
    if (keyselect.value === -1) return;
}

function typewatch(ev: string) {
    indisplay.value = ev;
    fzfin.value = ev;
    keyselect.value = -1;
}
</script>

<template>
    <div class="container" ref="container">
        <Input
            ref="inputbox"
            :model-value="indisplay"
            @update:model-value="typewatch($event!)"
            @keydown.arrow-up.prevent="prev"
            @keydown.arrow-down.prevent="next"
            @keydown.enter.prevent="select"
            placeholder="Select an option..."
        />
        <div
            v-if="active"
            class="dropdown"
            :style="{ top: `${10 + (container?.offsetHeight ?? 0)}px` }"
        >
            <div
                v-for="(item, index) of fzfout"
                :key="item"
                :class="cn('item', keyselect === index && 'selected')"
                @mousedown.prevent="select(index)"
            >
                {{ item }}
            </div>

            <div
                v-if="!fzfout.length"
                class="item sub"
            >
                No results found.
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.container {
    @apply relative w-full p-0;
}

.dropdown {
    @apply absolute w-full max-h-60 overflow-y-scroll;
    @apply bg-drop rounded-lg shadow-lg;
    @apply flex flex-col p-3 z-50;

    .item:not(.sub) {
        @apply py-2 px-3 hover:bg-card rounded-md;
        @apply scroll-my-3;

        &.selected {
            @apply bg-card;
        }
    }

    .item.sub {
        @apply py-1 px-2 text-sm text-sub italic;
    }

    ::-webkit-scrollbar-track {
        background: transparent;
    }

    scrollbar-color: var(--text-sub) transparent;
}
</style>
