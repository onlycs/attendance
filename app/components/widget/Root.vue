<script setup lang="ts">
import type { Permission } from "~/utils/api";

const props = defineProps<{
    required: Permission[];
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
    @apply flex flex-col items-center justify-center gap-2;
    @apply rounded-lg bg-drop;
}

.icon {
    @apply h-12 w-12 text-sub;
}

.desc {
    @apply h-0 text-center text-sm text-sub opacity-0 select-none;
    @apply group-hover/widget:h-6 group-hover/widget:opacity-100;
    @apply transition-all duration-200 group-hover/widget:duration-300;
}
</style>
