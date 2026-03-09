<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import api from "~/utils/api";
import { f } from "~/utils/form";
import { Math2 } from "~/utils/math";
import type { FormControl } from "../ui/form/Form.vue";

const form = f.form({
    items: {
        kind: f.hourtype.any(),
        sign_in: f.time({
            title: "Sign In",
            icon: "hugeicons:login-02",
            color: "green",
        }),
        sign_out: f.time({
            title: "Sign Out",
            icon: "hugeicons:logout-02",
            color: "red",
        }),
    },
    validate(submission) {
        const { sign_in, sign_out } = submission;
        const dt = sign_in.until(sign_out);

        if (dt.total({ unit: "minutes" }) <= 0) {
            return [
                {
                    field: "sign_out",
                    message: "Sign out must be after sign in",
                },
            ];
        }

        return [];
    },
    async submit(submission) {
        const entry = props.entry;

        const end = (ok: boolean) => {
            dirty.value = !ok;
            setTimeout(() => (loading.value = false), 500); // prevent flashing the spinner
        };

        const toLocal = (dt: Temporal.ZonedDateTime) => {
            return dt.withTimeZone(Temporal.Now.timeZoneId());
        };

        const toUTC = (dt: Temporal.ZonedDateTime) => {
            return dt.withTimeZone("UTC");
        };

        const assign = (
            dt: Temporal.ZonedDateTime,
            tod: Temporal.PlainTime,
        ) => {
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
    },
});

const props = defineProps<{ entry: AttendanceRecord }>();
const dirty = ref(false);
const control = ref<FormControl<typeof form>>();
const loading = ref(false);
const defaults = computed(() => {
    const entry = props.entry;

    return {
        kind: entry.hour_type,
        sign_in: entry.sign_in.toPlainTime(),
        sign_out: entry.sign_out?.toPlainTime() ?? undefined,
    };
});

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
                @click="control?.reset()"
            >
                <Icon name="hugeicons:arrow-turn-backward" size="20" />
                Reset
            </Button>

            <Button
                kind="primary"
                class="button"
                class:content="gap-2 text-sm"
                v-if="dirty"
                @click="control?.submit()"
            >
                <Icon name="hugeicons:upload-01" size="20" />
                Submit
            </Button>
        </div>

        <div :class="cn('label', dirty && 'italic')">
            {{ entryLabel($props.entry) }}

            <span v-if="dirty" class="not-italic"> • </span>
        </div>
    </div>

    <Form
        v-model:dirty="dirty"
        v-model:loading="loading"
        ref="control"
        :form="{
            ...form,
            defaults,
        }"
    />
</template>

<style scoped>
@reference "~/style/tailwind.css";

.header {
    @apply flex flex-row items-center justify-between gap-4 pr-1;
    @apply w-full;

    .button {
        @apply h-fit w-fit;
    }

    .label {
        @apply flex items-center gap-2;
        @apply whitespace-nowrap select-none;
    }
}

.times {
    @apply flex w-full flex-row items-center gap-2;
}

:deep(.spinner) {
    @apply mt-5.5 mb-4;
}
</style>
