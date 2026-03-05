<script setup lang="ts" generic="K extends PropertyKey">
import type { Input } from "#components";
import { Fzf, type FzfResultItem } from "fzf";

export interface ComboboxProps<Key extends PropertyKey> {
    kv: Record<Key, string>;
    compare?: (a: string, b: string) => number;
    placeholder?: string;
}

const props = defineProps<ComboboxProps<K>>();
const selected = defineModel<K | null>({ required: true });

const container = ref<HTMLDivElement>();
const inputbox = ref<InstanceType<typeof Input>>();
const active = ref(false);

const reversed = computed<Record<string, K>>(() => {
    return Object.fromEntries(Object.entries(props.kv).map(([k, v]) => [v, k]));
});

const items = computed(
    () =>
        Object.values<string>(props.kv).sort((a, b) => {
            if (props.compare) return props.compare(a, b);
            return a.localeCompare(b);
        }) as string[],
);

const indisplay = ref(selected.value ? props.kv[selected.value] : "");
const keyselect = ref(-1);

const fzf = computed(() => new Fzf(items.value));
const fzfin = ref("");
const fzfout = ref<FzfResultItem<string>[] | string[]>(items.value);

function unfzf(
    item: FzfResultItem<string> | string | undefined,
): string | undefined {
    if (item === undefined) return undefined;
    if (typeof item === "string") return item;
    return item.item;
}

watch([fzf, fzfin], ([fzf, fzfin]) => {
    fzfout.value = fzf.find(fzfin);
});

watch(keyselect, (keyselect) => {
    const key = unfzf(fzfout.value[keyselect]);
    selected.value = reversed.value[key ?? -1] ?? null;
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
    inputbox.value?.$el.blur();

    if (typeof index === "number") keyselect.value = index;
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
            v-model:focused="active"
            @keydown.arrow-up.prevent="prev"
            @keydown.arrow-down.prevent="next"
            @keydown.enter.prevent="select"
            @focusout="select()"
            :placeholder="$props.placeholder ?? 'Select an option...'"
        />

        <transition name="dropdown">
            <div
                v-if="active"
                class="dropdown"
                :style="{
                    top: `${10 + (container?.offsetHeight ?? 0)}px`,
                }"
            >
                <div
                    v-for="(item, index) of fzfout"
                    :key="unfzf(item)"
                    @mousedown.prevent="select(index)"
                    class="item"
                >
                    <template v-if="typeof item === 'string'">
                        {{ item }}
                    </template>

                    <template v-else>
                        <span
                            v-for="(char, i) of item.item"
                            :class="cn(item.positions.has(i) && 'text-red-300')"
                            :key="char"
                        >
                            {{ char }}
                        </span>
                    </template>

                    <div
                        :class="cn('hover', keyselect === index && 'selected')"
                    />
                </div>

                <div v-if="!fzfout.length" class="item sub">
                    No results found.
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.container {
    @apply relative w-full p-0;
}

.dropdown-enter-active,
.dropdown-leave-active {
    @apply transition-all duration-200;
}

.dropdown-enter-from,
.dropdown-leave-to {
    @apply -translate-y-2 opacity-0;
}

.dropdown {
    @apply absolute max-h-52 w-full overflow-y-scroll;
    @apply rounded-lg bg-card drop-shadow-xl;
    @apply z-50 flex flex-col gap-2 p-2 text-sm;

    .item:not(.sub) {
        @apply relative rounded-md px-3 py-2;
        @apply scroll-my-3;

        .hover {
            @apply absolute top-0 left-0 h-full w-full;
            @apply rounded-md bg-transparent;
            @apply hover:bg-white/5;

            &.selected {
                @apply bg-white/10;
            }
        }
    }

    .item.sub {
        @apply px-2 py-1 text-sm text-sub italic;
    }

    ::-webkit-scrollbar-track {
        background: transparent;
    }

    scrollbar-color: var(--text-sub) transparent;
}
</style>
