<script setup lang="ts">
import { toast } from "vue-sonner";
import api from "~/utils/api";

const ht = await f.hourtype_available({
    title: undefined,
    class: "select",
});

const { students } = useStudentData();
const creds = useCreds();
const crypto = useCrypto();
const names = studentNames(students);

const loading = ref(false);
const form = computed(() => {
    return f.form(
        {
            hour_type: ht,
            id_hashed: f.combobox({
                schema: names.value,
                placeholder: "Choose a student...",
                compare: sortNames,
            }),
        },
        [
            {
                form: "submit",
                label: "Sign In",
                kind: "success",
                class: "submit mt-2",
                context: "login",
            },
            {
                form: "submit",
                label: "Sign Out",
                kind: "danger",
                class: "submit",
                context: "logout",
            },
        ],
        {
            async submit(output, ctx) {
                loading.value = true;

                const end = () => setTimeout(() => loading.value = false, 500); // prevent flashing the spinner

                const otp = await api.roster.totp({
                    body: { hour_type: output.hour_type },
                });

                if (!ctx) {
                    end();
                    throw new Error(
                        "Unreachable: no context provided on form submit.",
                    );
                }

                if (!otp.data) {
                    api.error(otp.error, otp.response);
                    return end();
                }

                const res = await api.roster.swipe({
                    body: {
                        issuer: creds.value?.claims.sub ?? "",
                        totp: await crypto.totp(otp.data.secret) ?? "",
                        sid_hashed: output.id_hashed,
                        kind: output.hour_type,
                        action: ctx,
                        force: true,
                    },
                });

                if (!res.data) {
                    api.error(res.error, res.response);
                    return end();
                }

                if (res.data === "ignored") {
                    const io = ctx.replace("log", "");
                    toast.warning(`Already signed ${io}. No change.`);
                    return end();
                }

                if (res.data === "denied") {
                    toast.error("Something went wrong, please try again");
                    throw new Error(
                        "Unreachable: swipe was denied despite force flag.",
                    );
                }

                const io = res.data.replace("log", "");
                toast.success(`Successfully signed ${io}!`);
                end();
            },
        },
    );
});
</script>

<template>
    <WidgetRoot class="widget" :required="['roster', 'student_view']">
        <Form
            :form="form.form"
            :buttons="unref(form.buttons)"
            :deps="form.deps"
            @submit="form.submit"
            v-model:loading="loading"
        />
    </WidgetRoot>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.widget {
    @apply min-w-[24rem] min-h-62 p-4 pt-2;
}

.widget :deep(.submit) {
    @apply h-10;
}

.widget :deep(.select) {
    @apply -ml-2 -mb-1 w-[calc(100%+1rem)];
}
</style>
