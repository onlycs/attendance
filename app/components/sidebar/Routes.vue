<script setup lang="ts">
import type { ButtonProps } from "../ui/form/Button.vue";

export type Route = {
    name: string;
    icon: string;
    children?: never;
    button?: ButtonProps;
} | {
    name: string;
    icon: string;
    children: Record<string, Route>;
};

export interface RoutesProps {
    routes: Record<string, Route>;
    isChild?: boolean;
}

const props = defineProps<RoutesProps>();
const url = useRoute().path;

function expand(h: number) {
    return {
        height: `${(h * 9 + (h - 1) * 1.5) * 0.25}rem`,
    };
}
</script>

<template>
    <div :class="cn('routes', $props.isChild && 'child')">
        <template v-for="(route, path) of routes" :key="path">
            <Button
                v-if="!route.children"
                :kind="path === url ? 'secondary' : 'none'"
                class="routebtn"
                class:content="route"
                v-bind="route.button"
            >
                <Icon :name="route.icon" class="icon" />
                <label class="text">{{ route.name }}</label>
            </Button>
            <div
                class="dropdownbox"
                :style="expand(Object.keys(route.children).length)"
                v-else
            >
                <div
                    :class="cn(
                        'routebtn route dropdown',
                        url.startsWith(path) && 'active',
                    )"
                >
                    <Icon :name="route.icon" class="icon" />
                    <label class="text cursor-auto!">{{ route.name }}</label>
                </div>
                <SidebarRoutes
                    :routes="route.children"
                    isChild
                    class="w-full"
                />
            </div>
        </template>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.routes {
    @apply self-center;
    @apply relative flex flex-col gap-0.5;
    @apply duration-400;
    @apply group-hover/sidebar:gap-2.5;

    .child {
        @apply rounded-bl-xl;
        @apply absolute top-13;
        @apply group-hover/sidebar:pl-4 group-hover/sidebar:gap-1;
    }
}

.dropdownbox {
    @apply relative;
}

.group\/sidebar:not(:hover) .dropdownbox {
    @apply h-0!;
}

.routes :deep(.routebtn) {
    @apply p-3!;
    @apply transition-all;
}

.routes.child :deep(.routebtn) {
    @apply opacity-0!;
    @apply group-hover/sidebar:opacity-100!;
}

.routes :deep(.route) {
    @apply flex flex-row! justify-start! items-center!;

    .icon {
        @apply size-6;
        @apply group-hover/sidebar:mr-4!;
    }

    .text {
        @apply w-0;
        @apply whitespace-nowrap select-none;
        @apply cursor-pointer;
        @apply opacity-0 duration-[35ms]!;

        @apply group-hover/sidebar:opacity-100;
    }
}

.routes .dropdown {
    @apply rounded-md;

    &.active {
        @apply bg-card;
        @apply group-hover/sidebar:bg-transparent;
    }
}
</style>
