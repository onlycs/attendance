<script setup lang="ts">
import { toast } from "vue-sonner";
import z from "zod";
import api from "~/utils/api";

const { user } = useAuth();
const crypto = useCrypto();
const k1 = ref<string | null>(null);

watch(user, (user) => {
    if (user.role !== "admin") return;
    if (!user.ok) return;
    k1.value = user.k1;
}, { immediate: true });

const open = defineModel<boolean>("open", { required: true });
const loading = ref(false);

const { form, buttons, deps, submit, cancel } = f.form(
    {
        id: f.studentId(),
        first: f.input({
            title: "First Name",
            schema: z.string()
                .min(2, "First name is required")
                .regex(/^[A-Z]/, "Must start with a capital letter")
                .regex(
                    /^([A-Za-z]|-)+$/,
                    "Must only contain letters or dashes",
                ),
            placeholder: "John",
        }),
        last: f.input({
            title: "Last Name",
            schema: z.string()
                .min(2, "Last name is required")
                .regex(/^[A-Z]/, "Must start with a capital letter")
                .regex(
                    /^([A-Za-z]|-)+$/,
                    "Must only contain letters or dashes",
                ),
            placeholder: "Doe",
        }),
    },
    [
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
    {
        async submit(submit) {
            const end = () => {
                open.value = false;
                setTimeout(() => loading.value = false, 500); // after drawer close animation
            };

            loading.value = true;

            if (!k1.value) {
                useRouter().push(
                    redirect.build("/dashboard", "session-expired"),
                );

                return;
            }

            const data = await crypto.encrypt(
                [
                    submit.id,
                    submit.first,
                    submit.last,
                ],
                hex.asbytes(k1.value),
            );

            if (!data || data.length !== 3) {
                toast.error("Encryption failed. Please try again");
                return end();
            }

            const [id, first, last] = data as [string, string, string];
            const res = await api.student.add({
                body: {
                    id,
                    id_hashed: sha256(submit.id),
                    first,
                    last,
                },
            });

            end();

            if (res.error) {
                return api.error(res.error, res.response);
            }

            toast.success("Student added");
        },
        cancel() {
            toast.warning("New student not added");
            open.value = false;
        },
    },
);
</script>
<template>
    <Drawer
        v-model:open="open"
        @close="cancel"
    >
        <span class="title">New Student</span>

        <div class="form">
            <Form
                v-model:loading="loading"
                :form
                :buttons
                :deps
                @cancel="cancel"
                @submit="submit"
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
}

.form :deep(.submit) {
    @apply mt-6;
}
</style>
