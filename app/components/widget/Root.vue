<script setup lang="ts">
import type { Permissions } from "~/utils/api";

const props = defineProps<{
    required: (keyof Permissions)[];
    class?: string | string[];
}>();

const creds = useCreds();
const matches = computed(() => {
    for (const req of props.required) {
        if (!creds.value?.claims.perms[req]) return false;
    }

    return true;
});
</script>

<template>
    <div :class="cn('widget', 'group/widget', $props.class)">
        <template v-if="matches">
            <slot />
        </template>
        <template v-else>
            <Icon name="hugeicons:square-lock-01" class="icon" />
            <span class="desc">
                You don't have permission
                <br />to use this widget.
            </span>
        </template>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.widget {
    @apply flex flex-col gap-2 justify-center items-center;
    @apply bg-drop rounded-lg;
}

.icon {
    @apply w-12 h-12 text-sub;
}

.desc {
    @apply h-0 opacity-0 text-sm text-center text-sub select-none;
    @apply group-hover/widget:h-6 group-hover/widget:opacity-100;
    @apply transition-all duration-200 group-hover/widget:duration-300;
}
</style>
