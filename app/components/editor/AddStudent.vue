<script setup lang="ts">
import { toast } from "vue-sonner";
import z from "zod";
import api from "~/utils/api";
import { f } from "~/utils/form";

const { user } = useAuth();
const crypto = useCrypto();
const k1 = ref<string | null>(null);

watch(
    user,
    (user) => {
        if (user.role !== "admin") return;
        if (!user.ok) return;
        k1.value = user.k1;
    },
    { immediate: true },
);

const open = defineModel<boolean>("open", { required: true });
const loading = ref(false);

const form = f.form({
    items: {
        id: await f.studentId(),
        first: f.input(
            {
                title: "First Name",
                placeholder: "John",
            },
            z
                .string()
                .min(2, "First name is required")
                .regex(/^[A-Z]/, "Must start with a capital letter")
                .regex(
                    /^([A-Za-z]|-)+$/,
                    "Must only contain letters or dashes",
                ),
        ),
        last: f.input(
            {
                title: "Last Name",
                placeholder: "Doe",
            },
            z
                .string()
                .min(2, "Last name is required")
                .regex(/^[A-Z]/, "Must start with a capital letter")
                .regex(
                    /^([A-Za-z]|-)+$/,
                    "Must only contain letters or dashes",
                ),
        ),
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

    async validate(submit) {
        const id_hashed = sha256(submit.id);
        const existing = await api.student.query({
            path: { id_hashed },
        });

        if (existing.data) {
            return [
                {
                    field: "id",
                    message: "A student with this ID already exists.",
                },
            ];
        }

        return [];
    },
    async submit(submit) {
        const end = () => {
            open.value = false;
            setTimeout(() => (loading.value = false), 500); // after drawer close animation
        };

        loading.value = true;

        if (!k1.value) {
            useRouter().push(redirect.build("/dashboard", "session-expired"));

            return;
        }

        const data = await crypto.encrypt(
            [submit.id, submit.first, submit.last],
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
});
</script>
<template>
    <Drawer v-model:open="open" @close="form.cancel">
        <span class="title">New Student</span>

        <div class="form">
            <Form v-model:loading="loading" :form />
        </div>
    </Drawer>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.title {
    @apply mb-2 text-xl md:text-2xl;
}

.form {
    @apply mt-8 flex flex-col gap-2;
    @apply max-w-full md:w-[32rem] lg:w-[38rem];
    @apply items-center;
}

.form :deep(.submit) {
    @apply mt-6;
}
</style>
