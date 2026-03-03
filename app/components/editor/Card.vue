<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import api from "~/utils/api";

const props = defineProps<{
    hashed: string;
    date: Temporal.PlainDate;
    entries: Ref<readonly AttendanceRecord[]>;
}>();

const hash = (e: AttendanceRecord) => {
    return [
        e.id,
        e.hour_type,
        e.sign_in.toPlainTime().toString(),
        e.sign_out?.toPlainTime().toString() ?? "null",
    ].join(":");
};

async function add() {
    const res = await api.roster.record.add({
        body: {
            sid_hashed: props.hashed,
            kind: "build",
            time_in: api.datetime.ser(
                props.date.toZonedDateTime({
                    timeZone: Temporal.Now.timeZoneId(),
                    plainTime: Temporal.Now.plainTimeISO(),
                }),
            ),
            time_out: null,
        },
    });

    if (!res.data) {
        api.error(res.error, res.response);
        return;
    }
}
</script>

<template>
    <div class="root">
        <div
            v-for="(entry, i) of $props.entries.value"
            class="entry"
            :key="hash(entry)"
        >
            <EditorCardForm :entry />
        </div>

        <Button kind="none" class="button-add" @click="add">
            <Icon name="hugeicons:add-01" size="20" />
        </Button>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.root {
    @apply flex flex-col;
    @apply bg-drop rounded-lg gap-2 p-2;
    @apply border border-border;

    .entry {
        @apply flex flex-col items-center;
        @apply bg-background rounded-md gap-2 p-2;
    }

    .button-add {
        @apply flex items-center justify-center;
        @apply w-full h-fit bg-background;
    }
}
</style>
