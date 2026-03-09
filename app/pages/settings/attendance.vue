<script setup lang="ts">
import z from "zod";
import type { FormControl } from "~/components/ui/form/Form.vue";
import type { HourType } from "~/utils/api";
import api, { HourTypeTitles, HourTypes } from "~/utils/api";
import { f } from "~/utils/form";

definePageMeta({ layout: "admin-protected" });

const htdata = Object.fromEntries(
    await Promise.all(
        HourTypes.map(async (kind) => {
            const res = await api.hour_type.query({ path: { kind } });
            if (!res.data)
                api.error(res.error, res.response, {
                    handle: { [403]: () => {} },
                });
            return [kind, res.data] as const;
        }),
    ),
) as Record<HourType, Awaited<ReturnType<typeof api.hour_type.query>>["data"]>;
const zGoal = z.string().regex(/^\d+(\.\d*)?$/, "Must be a number");

const items = Object.fromEntries(
    HourTypes.flatMap((kind) => [
        [
            `${kind}_start`,
            f
                .date({
                    title: `${kind}-start`,
                    class: "!rounded-md",
                    omitYear: true,
                })
                .optional(),
        ],
        [
            `${kind}_end`,
            f
                .date({
                    title: `${kind}-end`,
                    class: "!rounded-md",
                    omitYear: true,
                })
                .optional(),
        ],
        [
            `${kind}_goal`,
            f.input(
                { title: `${kind}-goal`, class: "!rounded-md goal" },
                zGoal,
            ),
        ],
    ]),
);

const defaults = Object.fromEntries(
    HourTypes.flatMap((kind) => {
        const d = htdata[kind];
        return [
            [`${kind}_start`, api.plaindate.parse(d?.begins) ?? undefined],
            [`${kind}_end`, api.plaindate.parse(d?.ends) ?? undefined],
            [`${kind}_goal`, d?.goal.toString() ?? ""],
        ];
    }),
);

const form = f.form({
    items,
    defaults,
    async submit(data: Record<string, any>) {
        const results = await Promise.all(
            HourTypes.map((kind) =>
                api.hour_type.update({
                    path: { kind },
                    body: {
                        begins: api.plaindate.ser(data[`${kind}_start`]),
                        ends: api.plaindate.ser(data[`${kind}_end`]),
                        goal: parseFloat(data[`${kind}_goal`]),
                    },
                }),
            ),
        );

        for (const res of results) {
            if (res.error) return api.error(res.error, res.response);
        }
    },
});

const FieldSubtitles: Record<string, string> = {
    start: "Start Date",
    end: "End Date",
    goal: "Goal (Hours)",
};

function subtitle(key: string) {
    return FieldSubtitles[key.split("-")[1] ?? ""] ?? "Unknown";
}

const Descriptions: Record<string, string> = {
    "build-start": "Default: Day of the kickoff event",
    "build-end": "Default: 04/30",
    "learning-start": "Default: 09/01",
    "learning-end": "Set to day before build season start if blank",
    "offseason-start": "Set to day after build season end if blank",
    "offseason-end": "Set to day before build season start if blank",
    "demo-start": "Set to start of the year if blank",
    "demo-end": "Set to end of the year if blank",
};

function title(key: string) {
    if (key.split("-")[1] !== "start") return null;
    return HourTypeTitles[key.split("-")[0] as HourType] ?? null;
}

const control = ref<FormControl<typeof form> | null>(null);
const loading = ref(false);
</script>

<template>
    <RequirePerms :required="['hours_edit']">
        <div class="page">
            <Form
                :form="form"
                ref="control"
                class="w-4xl!"
                v-model:loading="loading"
            >
                <template #item="{ component, props, model, update }">
                    <div class="title" v-if="title(props.title)">
                        {{ title(props.title) }}
                    </div>

                    <div class="setting">
                        <div class="info">
                            <span class="subtitle">
                                {{ subtitle(props.title) }}
                            </span>
                            <span class="desc" v-if="Descriptions[props.title]">
                                {{ Descriptions[props.title] }}
                            </span>
                        </div>

                        <div class="end">
                            <Button
                                kind="warning"
                                @click="update(null)"
                                v-if="props.title.split('-')[1] !== 'goal'"
                            >
                                <Icon name="hugeicons:eraser-01" />
                            </Button>

                            <component
                                :is="component"
                                v-bind="props"
                                :model-value="model"
                                @update:model-value="update"
                            />
                        </div>
                    </div>
                </template>
            </Form>

            <div class="control" v-if="!loading">
                <Button
                    kind="primary"
                    @click="() => control?.submit()"
                    class="save"
                    class:content="!gap-2"
                >
                    <Icon name="hugeicons:upload-01" class="icon" />
                    Save
                </Button>
            </div>
        </div>
    </RequirePerms>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
    @apply flex w-full flex-col gap-2 overflow-y-scroll;
    @apply items-center py-4;
}

.setting {
    @apply flex w-4xl items-center justify-between gap-4;
    @apply rounded-lg bg-card p-2 pl-5;
}

.info {
    @apply flex flex-col gap-1 select-none;

    .subtitle {
        @apply text-sm;
    }

    .desc {
        @apply text-xs text-sub;
    }
}

.title {
    @apply mt-6 mb-1 ml-2 text-lg font-normal select-none;
}

.save {
    @apply h-fit w-fit px-2 py-1;
}

.control {
    @apply flex w-4xl items-end justify-end;
}

.end {
    @apply flex h-full items-center justify-center gap-2;
}

:deep(.goal) {
    @apply px-3! py-2!;
}
</style>
