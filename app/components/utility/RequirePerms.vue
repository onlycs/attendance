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
    <template v-if="matches">
        <slot />
    </template>
    <template v-else>
        <div class="box">
            <HiddenText icon="hugeicons:square-lock-01">
                You don't have permission
                <br />to view this content.
            </HiddenText>
        </div>
    </template>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.box {
    @apply flex h-full w-full items-center justify-center;
}
</style>
