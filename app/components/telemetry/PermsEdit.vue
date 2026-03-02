E<script setup lang="ts">
import type { EventPermissionEdit, Permissions } from "~/utils/api";
import api, { PermissionTitles } from "~/utils/api";

const props = defineProps<{ event: EventPermissionEdit; }>();
const denied = ref(false);

const authorizer = await api.admin.query.one({
    path: { id: props.event.admin_id },
});

if (!authorizer.data) denied.value = true;

const target = await api.admin.query.one({
    path: { id: props.event.target_id },
});

if (!target.data) denied.value = true;
</script>

<template>
    <div class="data">
        <HiddenText
            v-if="denied"
            icon="hugeicons:information-circle"
        >
            You don't have permission to view this event.
        </HiddenText>

        <template v-else>
            <div class="content">
                <span class="title">Edited By</span>
                <span class="value">{{ authorizer.data?.username }}</span>
                <span class="title">Edited User</span>
                <span class="value">{{ target.data?.username }}</span>
            </div>

            <div class="edited mt-4">
                <span class="title nr !rounded-tl-md !bg-card-2">Field</span>
                <span class="title nr">Old</span>
                <span class="title nr !rounded-tr-md">Changed To</span>

                <template
                    v-for="([k, v]) of Object.entries(props.event.old) as [
                        keyof Permissions,
                        boolean,
                    ][]"
                >
                    <span class="title nr">{{ PermissionTitles[k] }}</span>
                    <span class="value nr">{{ v ? "Yes" : "No" }}</span>
                    <span class="value nr">
                        {{
                            props.event.new[k]
                            ? "Yes"
                            : "No"
                        }}
                    </span>
                </template>
            </div>
        </template>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.data {
    @apply w-full;
    @apply flex flex-col items-center justify-center;
}

.content {
    @apply grid w-full h-full;
    @apply grid-cols-2;
    @apply select-none;
    row-gap: 1rem;
}

.edited {
    @apply grid w-full h-full;
    @apply grid-cols-3;
    @apply select-none;
}

.title, .value {
    @apply flex justify-center items-center;
}

.title {
    @apply bg-white/9 h-14 w-full rounded-l-md;

    &.nr {
        @apply rounded-none;
    }
}

.value {
    @apply bg-white/3 h-14 w-full rounded-r-md px-8 text-nowrap;

    &.nr {
        @apply rounded-none;
    }
}

.title.nr:last-of-type {
    @apply rounded-bl-md;
}

.value.nr:last-of-type {
    @apply rounded-br-md;
}
</style>
