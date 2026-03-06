<script setup lang="ts">
import z from "zod";
import type { FormControl } from "~/components/ui/form/Form.vue";
import type { HourType } from "~/utils/api";
import api, { HourTypeTitles } from "~/utils/api";
import { f } from "~/utils/form";

definePageMeta({ layout: "admin-protected" });

const htdata = async (kind: HourType) => {
    const res = await api.hour_type.query({
        path: { kind },
    });

    if (!res.data) {
        api.error(res.error, res.response);
    }

    return res.data;
};

const build = await htdata("build");
const learning = await htdata("learning");
const demo = await htdata("demo");
const offseason = await htdata("offseason");

const form = f.form({
    items: {
        build_start: f
            .date({
                title: "build-start",
                class: "!rounded-md",
                omitYear: true,
            })
            .optional(),
        build_end: f
            .date({
                title: "build-end",
                class: "!rounded-md",
                omitYear: true,
            })
            .optional(),
        build_goal: f.input(
            {
                title: "build-goal",
                class: "!rounded-md goal",
            },
            z.string().regex(/^\d+(\.\d*)?$/, "Must be a number"),
        ),
        learning_start: f
            .date({
                title: "learning-start",
                class: "!rounded-md",
                omitYear: true,
            })
            .optional(),
        learning_end: f
            .date({
                title: "learning-end",
                class: "!rounded-md",
                omitYear: true,
            })
            .optional(),
        learning_goal: f.input(
            {
                title: "learning-goal",
                class: "!rounded-md goal",
            },
            z.string().regex(/^\d+(\.\d*)?$/, "Must be a number"),
        ),
        offseason_start: f
            .date({
                title: "offseason-start",
                class: "!rounded-md",
                omitYear: true,
            })
            .optional(),
        offseason_end: f
            .date({
                title: "offseason-end",
                class: "!rounded-md",
                omitYear: true,
            })
            .optional(),
        offseason_goal: f.input(
            {
                title: "offseason-goal",
                class: "!rounded-md goal",
            },
            z.string().regex(/^\d+(\.\d*)?$/, "Must be a number"),
        ),
        demo_start: f
            .date({
                title: "demo-start",
                class: "!rounded-md",
                omitYear: true,
            })
            .optional(),
        demo_end: f
            .date({
                title: "demo-end",
                class: "!rounded-md",
                omitYear: true,
            })
            .optional(),
        demo_goal: f.input(
            {
                title: "demo-goal",
                class: "!rounded-md goal",
            },
            z.string().regex(/^\d+(\.\d*)?$/, "Must be a number"),
        ),
    },
    defaults: {
        build_start: api.plaindate.parse(build?.begins) ?? undefined,
        build_end: api.plaindate.parse(build?.ends) ?? undefined,
        build_goal: build?.goal.toString() ?? "",
        learning_start: api.plaindate.parse(learning?.begins) ?? undefined,
        learning_end: api.plaindate.parse(learning?.ends) ?? undefined,
        learning_goal: learning?.goal.toString() ?? "",
        offseason_start: api.plaindate.parse(offseason?.begins) ?? undefined,
        offseason_end: api.plaindate.parse(offseason?.ends) ?? undefined,
        offseason_goal: offseason?.goal.toString() ?? "",
        demo_start: api.plaindate.parse(demo?.begins) ?? undefined,
        demo_end: api.plaindate.parse(demo?.ends) ?? undefined,
        demo_goal: demo?.goal.toString() ?? "",
    },
    async submit(data) {
        const rbuild = await api.hour_type.update({
            path: { kind: "build" },
            body: {
                begins: api.plaindate.ser(data.build_start),
                ends: api.plaindate.ser(data.build_end),
                goal: build!.goal,
            },
        });

        const rlearning = await api.hour_type.update({
            path: { kind: "learning" },
            body: {
                begins: api.plaindate.ser(data.learning_start),
                ends: api.plaindate.ser(data.learning_end),
                goal: learning!.goal,
            },
        });

        const roffseason = await api.hour_type.update({
            path: { kind: "offseason" },
            body: {
                begins: api.plaindate.ser(data.offseason_start),
                ends: api.plaindate.ser(data.offseason_end),
                goal: offseason!.goal,
            },
        });

        const rdemo = await api.hour_type.update({
            path: { kind: "demo" },
            body: {
                begins: api.plaindate.ser(data.demo_start),
                ends: api.plaindate.ser(data.demo_end),
                goal: demo!.goal,
            },
        });

        if (rbuild.error) return api.error(rbuild.error, rbuild.response);
        if (rlearning.error)
            return api.error(rlearning.error, rlearning.response);
        if (roffseason.error)
            return api.error(roffseason.error, roffseason.response);
        if (rdemo.error) return api.error(rdemo.error, rdemo.response);
    },
});

function subtitle(key: string) {
    return (
        {
            start: "Start Date",
            end: "End Date",
            goal: "Goal (Hours)",
        }[key.split("-")[1] ?? ""] ?? "Unknown"
    );
}

const Descriptions = {
    "build-start": "Default: Day of the kickoff event",
    "build-end": "Default: 04/30",
    "learning-start": "Default: 09/01",
    "learning-end": "Set to day before build season start if blank",
    "offseason-start": "Set to day after build season end if blank",
    "offseason-end": "Set to day before build season start if blank",
    "demo-start": "Set to start of the year if blank",
    "demo-end": "Set to end of the year if blank",
} as Record<string, string>;

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
                class="!w-4xl"
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
                            <span class="desc">
                                {{ Descriptions[props.title] }}
                            </span>
                        </div>

                        <div class="end">
                            <component
                                :is="component"
                                v-bind="props"
                                :model-value="model"
                                @update:model-value="update"
                            />

                            <Button
                                kind="warning"
                                @click="update(null)"
                                v-if="props.title.split('-')[1] !== 'goal'"
                            >
                                <Icon name="hugeicons:arrow-turn-backward" />
                            </Button>
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
    @apply items-center;
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
    @apply mt-6 text-lg font-normal select-none;
}

.save {
    @apply w-22;
}

.control {
    @apply flex w-4xl items-end justify-end;
}

.end {
    @apply flex h-full items-center justify-center gap-2;
}

:deep(.goal) {
    @apply !px-3 !py-2;
}
</style>
