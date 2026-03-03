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

const props = defineProps<{ currentId: string }>();
const open = defineModel<boolean>("open", { required: true });
const loading = ref(false);
const emit = defineEmits<{ retry: [] }>();

const form = f.form({
    items: {
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
    async submit(submit, _) {
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
            [props.currentId, submit.first, submit.last],
            hex.asbytes(k1.value),
        );

        if (!data || data.length !== 3) {
            toast.error("Encryption failed. You were not signed in.");
            return end();
        }

        const [id, first, last] = data as [string, string, string];
        const res = await api.student.add({
            body: {
                id,
                id_hashed: sha256(props.currentId),
                first,
                last,
            },
        });

        end();

        if (res.error) {
            return api.error(res.error, res.response);
        }

        emit("retry");
    },
    cancel() {
        toast.warning("Cancelled. You were not signed in.");
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
    @apply mt-8 gap-2 flex flex-col;
    @apply md:w-[32rem] lg:w-[38rem] max-w-full;
}

.form :deep(.submit) {
    @apply mt-6;
}
</style>
