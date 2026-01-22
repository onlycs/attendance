<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { zPlainTime } from "temporal-zod";
import api from "~/utils/api";
import { Math2 } from "~/utils/math";

const props = defineProps<{ entry: AttendanceRecord; }>();
const dirty = ref(false);
const reset = ref(() => {});
const loading = ref(false);
const formSubmit = ref(() => {});
const defaults = computed(() => {
    const entry = props.entry;

    return {
        kind: entry.hour_type,
        sign_in: entry.sign_in.toPlainTime(),
        sign_out: entry.sign_out?.toPlainTime() ?? undefined,
    };
});

const { form, deps, buttons, validate } = f.form(
    {
        kind: f.hourtype(),
        sign_in: f.time({
            title: "Sign In",
            icon: "hugeicons:login-02",
            color: "green",
            schema: zPlainTime,
        }),
        sign_out: f.time({
            title: "Sign Out",
            icon: "hugeicons:logout-02",
            color: "red",
            schema: zPlainTime,
        }),
    },
    [],
    {
        validate(submission) {
            const { sign_in, sign_out } = submission;
            const dt = sign_in.until(sign_out);

            if (dt.total({ unit: "minutes" }) <= 0) {
                return [{
                    field: "sign_out",
                    message: "Sign out must be after sign in",
                }];
            }

            return [];
        },
    },
);

function entryLabel(entry: AttendanceRecord) {
    if (!entry.sign_out) return "Ongoing";
    return Math2.formatHours(
        entry.sign_in.until(entry.sign_out).total({ unit: "hours" }),
    );
}

async function del(id: string) {
    const res = await api.roster.record.delete({
        body: { entry_id: id },
    });

    if (!res.data) {
        api.error(res.error, res.response);
        return;
    }
}

async function onSubmit(submission: FormOutput<typeof form, typeof deps>) {
    const entry = props.entry;

    const end = (ok: boolean) => {
        dirty.value = !ok;
        setTimeout(() => loading.value = false, 500); // prevent flashing the spinner
    };

    const toLocal = (dt: Temporal.ZonedDateTime) => {
        return dt.withTimeZone(Temporal.Now.timeZoneId());
    };

    const toUTC = (dt: Temporal.ZonedDateTime) => {
        return dt.withTimeZone("UTC");
    };

    const assign = (dt: Temporal.ZonedDateTime, tod: Temporal.PlainTime) => {
        return api.datetime.ser(toUTC(toLocal(dt).withPlainTime(tod)));
    };

    const patched = {
        id: entry.id,
        hour_type: submission.kind,
        sign_in: assign(entry.sign_in, submission.sign_in),
        sign_out: entry.sign_out
            ? assign(entry.sign_out, submission.sign_out)
            : assign(entry.sign_in, submission.sign_out),
    };

    loading.value = true;

    const res = await api.roster.record.update({
        body: patched,
    });

    if (!res.data) {
        api.error(res.error, res.response);
        end(false);
        return;
    }

    end(true);
}
</script>

<template>
    <div class="header">
        <div class="flex gap-2">
            <Button
                kind="danger"
                class="button"
                class:content="gap-2 text-sm"
                @click="del($props.entry.id)"
            >
                <Icon name="hugeicons:delete-02" size="20" />
                Delete
            </Button>

            <Button
                kind="secondary"
                class="button"
                class:content="gap-2 text-sm"
                v-if="dirty"
                @click="reset()"
            >
                <Icon name="hugeicons:arrow-turn-backward" size="20" />
                Reset
            </Button>

            <Button
                kind="primary"
                class="button"
                class:content="gap-2 text-sm"
                v-if="dirty"
                @click="formSubmit()"
            >
                <Icon name="hugeicons:upload-01" size="20" />
                Submit
            </Button>
        </div>

        <div
            :class="cn(
                'label',
                dirty && 'italic',
            )"
        >
            {{ entryLabel($props.entry) }}

            <span v-if="dirty" class="not-italic">
                •
            </span>
        </div>
    </div>

    <Form
        v-model:dirty="dirty"
        v-model:loading="loading"
        :ref="(el) => {
            if (el) {
                // from defineExpose
                const e = el as unknown as {
                    submit: () => void;
                    reset: () => void;
                };
                formSubmit = e.submit;
                reset = e.reset;
            }
        }"
        :form
        :deps
        :buttons
        :validate
        :defaults
        @submit="onSubmit"
    />
</template>

<style scoped>
@reference "~/style/tailwind.css";

.header {
    @apply flex flex-row items-center justify-between gap-4 pr-1;
    @apply w-full;

    .button {
        @apply w-fit h-fit;
    }

    .label {
        @apply flex items-center gap-2;
        @apply select-none whitespace-nowrap;
    }
}

.times {
    @apply flex flex-row items-center gap-2 w-full;
}

:deep(.spinner) {
    @apply mt-5.5 mb-4;
}
</style>
