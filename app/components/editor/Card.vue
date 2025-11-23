<script setup lang="ts">
import { Select } from "#components";
import { Temporal } from "temporal-polyfill";
import { Math2 } from "~/utils/math";
import type { ReplicationOutgoing } from "~/utils/zodws/schema/replicate";
import type { Entry } from "~/utils/zodws/schema/table";

defineProps<{
    hashed: string;
    date: Temporal.PlainDate;
    entries: Entry[];
    push: (repl: ReplicationOutgoing) => void;
}>();

function entryLabel(entry: Entry) {
    if (!entry.end) return "Ongoing";
    return Math2.formatHours(
        entry.start.until(entry.end).total({ unit: "hours" }),
    );
}
</script>

<template>
    <div class="mroot">
        <div
            v-for="entry of $props.entries"
            class="entry"
            :key="entry.id"
            :id="entry.id"
        >
            <div class="header">
                <Button
                    kind="error-transparent"
                    class="button"
                    @click="() => {
                        push({
                            type: 'DeleteEntry',
                            hashed: $props.hashed,
                            date: $props.date,
                            id: entry.id,
                        });
                    }"
                >
                    <Icon name="hugeicons:delete-02" size="20" />
                </Button>

                <div class="label">
                    {{ entryLabel(entry) }}
                </div>
            </div>

            <Select
                :selected="entry.kind"
                :options="{
                    learning: 'Learning',
                    build: 'Build',
                    demo: 'Outreach',
                    offseason: 'Offseason',
                }"
                @update:selected="(kind) => {
                    push({
                        type: 'UpdateEntry',
                        hashed: $props.hashed,
                        date: $props.date,
                        id: entry.id,
                        updates: [
                            {
                                key: 'kind',
                                value: kind,
                            },
                        ],
                    });
                }"
            />

            <div class="times">
                <TimePickerModelSubmit
                    :time="entry.start.toPlainTime()"
                    background="card"
                    @update:time="(time) => {
                        push({
                            type: 'UpdateEntry',
                            hashed: $props.hashed,
                            date: $props.date,
                            id: entry.id,
                            updates: [
                                {
                                    key: 'start',
                                    value: entry.start.with({
                                        hour: time.hour,
                                        minute: time.minute,
                                        second: time.second,
                                        millisecond: 0,
                                    }),
                                },
                            ],
                        });
                    }"
                    icon="tabler:door-enter"
                    color="green"
                />

                <TimePickerModelSubmit
                    background="card"
                    :time="entry.end
                    ? entry.end.toPlainTime()
                    : undefined"
                    @update:time="(time) => {
                        push({
                            type: 'UpdateEntry',
                            hashed: $props.hashed,
                            date: $props.date,
                            id: entry.id,
                            updates: [
                                {
                                    key: 'end',
                                    value: (entry.end
                                        ?? entry.start)
                                        .with({
                                            hour: time.hour,
                                            minute:
                                                time.minute,
                                            second:
                                                time.second,
                                            millisecond: 0,
                                        }),
                                },
                            ],
                        });
                    }"
                    icon="tabler:door-exit"
                    color="red"
                />
            </div>
        </div>

        <Button
            kind="background"
            class="button-add"
            @click="() => {
                const now = Temporal.Now.zonedDateTimeISO().with({
                    year: date.year,
                    month: date.month,
                    day: date.day,
                });

                push({
                    type: 'AddEntry',
                    hashed: $props.hashed,
                    date: $props.date,
                    entry: {
                        kind: 'learning',
                        start: now.with({ minute: now.minute - 5 }),
                        end: now,
                    },
                });
            }"
        >
            <Icon name="tabler:plus" size="20" />
        </Button>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.mroot {
    @apply bg-drop rounded-lg;
    @apply border border-border;
    @apply flex flex-col gap-4 p-4;

    .entry {
        @apply bg-background rounded-lg;
        @apply p-2;
        @apply flex flex-col gap-2;

        .header {
            @apply flex flex-row items-center justify-between gap-4;

            .button {
                @apply flex flex-row justify-center items-center p-2.75;
            }

            .label {
                @apply select-none mr-2;
            }
        }

        .times {
            @apply flex flex-row items-center gap-2 w-full;
        }
    }

    .button-add {
        @apply flex items-center justify-center;
    }
}
</style>
