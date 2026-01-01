<script setup lang="ts" generic="K extends string">
import type { ButtonProps } from "./form/Button.vue";

export interface DropdownProps<K extends string> {
    items: K[];
    active?: K;
    trigger?: Omit<ButtonProps, "kind">;
    entries?:
        | ((entry: string) => Omit<ButtonProps, "kind">)
        | Omit<ButtonProps, "kind">
        | Record<K, Omit<ButtonProps, "kind">>;

    "class:items"?: string | string[];
    "class:item"?: string | string[];
}

const props = defineProps<DropdownProps<K>>();
const open = defineModel<boolean>("open", { default: false });
const entry = (label: K): Omit<ButtonProps, "kind"> => {
    if (!props.entries) return {};
    else if (typeof props.entries === "function") return props.entries(label);
    else if (label in props.entries) return (props.entries as any)[label];
    else return props.entries as Omit<ButtonProps, "kind">;
};
</script>

<template>
    <Button
        v-bind="$props.trigger"
        :kind="items.includes(active!) ? 'secondary' : 'none'"
        @click="open = !open"
        class="trigger"
    >
        <slot name="trigger" />
    </Button>
    <div :class="cn('items', $props['class:items'])">
        <div
            v-for="item of items"
            :class="cn('item', $props['class:item'])"
            :key="item"
        >
            <Button
                :kind="item === active && open ? 'secondary' : 'none'"
                class="trigger"
            >
                <slot name="entry" :entry="item" />
            </Button>
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.items {
    @apply absolute w-full;

    .item {
        @apply w-full;
    }
}
</style>
