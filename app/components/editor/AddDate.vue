<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { zPlainDate, zPlainTime } from "temporal-zod";
import { toast } from "vue-sonner";
import api from "~/utils/api";
import { f } from "~/utils/form";

const props = defineProps<{ students: { [id: string]: string; }; }>();
const open = defineModel<boolean>("open", { required: true });
const loading = ref(false);

const form = f.form(
    {
        items: {
            student: f.combobox(props.students, {
                title: "Student",
            }),
            kind: f.hourtype.any(),
            date: f.date({
                title: "Date",
            }),
            start: f.time({
                title: "Sign In",
                color: "green",
                icon: "hugeicons:login-02",
            }),
            end: f.time({
                title: "Sign Out",
                color: "red",
                icon: "hugeicons:logout-02",
            }),
        },
        buttons: [
            {
                form: "submit",
                label: "Submit",
                kind: "primary",
                class: "submit",
            },
            {
                form: "cancel",
                label: "Cancel",
                kind: "secondary-card",
            },
        ],
        async validate(submission) {
            const start = submission.date.toPlainDateTime(submission.start);
            const end = submission.date.toPlainDateTime(submission.end);
            const dt = start.until(end);

            if (dt.total("minutes") <= 0) {
                return [{
                    field: "end",
                    message: "End time must be after start time.",
                }];
            }

            return [];
        },

        async submit(submission) {
            // convert date and time, interpet as local and convert to UTC
            const start = submission.date.toPlainDateTime(submission.start)
                .toZonedDateTime(Temporal.Now.timeZoneId());
            const end = submission.date.toPlainDateTime(submission.end)
                .toZonedDateTime(Temporal.Now.timeZoneId());

            loading.value = true;

            const res = await api.roster.record.add({
                body: {
                    sid_hashed: submission.student,
                    time_in: api.datetime.ser(start),
                    time_out: api.datetime.ser(end),
                    kind: submission.kind,
                },
            });

            open.value = false;
            setTimeout(() => loading.value = false, 500); // after drawer close animation

            if (!res.data) {
                return api.error(res.error, res.response);
            }

            toast.success("Entry added");
        },

        cancel() {
            toast.warning("Entry not added");
            open.value = false;
        },
    },
);
</script>

<template>
    <Drawer v-model:open="open" @close="form.cancel">
        <div class="title">Custom Entry</div>

        <div class="form">
            <Form
                v-model:loading="loading"
                :form
            />
        </div>
    </Drawer>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.title {
    @apply mb-2 text-xl md:text-2xl;
}

.form {
    @apply mt-8 gap-2 flex flex-col;
    @apply md:w-[32rem] lg:w-[38rem] max-w-full;
    @apply items-center;
}

.form :deep(.submit) {
    @apply mt-6;
}
</style>
