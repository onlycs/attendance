<script setup lang="ts">
import { toast } from "vue-sonner";
import api from "~/utils/api";
import { f } from "~/utils/form";

const loading = ref(false);
const crypto = useCrypto();
const router = useRouter();
const route = useRoute();

const k3 = route.query.k3 as string | undefined;
const token = route.query.token as string | undefined;

if (!k3 || !token) {
    router.push(redirect.build("/", "bad-invite-link"));
}

const form = f.form({
    items: {
        username: f.username({
            title: "Username",
            placeholder: "_johndoe01",
            "class:container": "input",
        }),
        password: f.password.new({
            title: "Password",
            "class:container": "input",
        }),
        password_confirm: f.password.new({
            title: "Confirm Password",
            "class:container": "input",
        }),
    },
    buttons: [
        {
            form: "submit",
            label: "Create Account",
            class: "submit",
            kind: "primary",
        },
    ],
    validate(output) {
        if (output.password !== output.password_confirm) {
            return [
                {
                    field: "password_confirm",
                    message: "Passwords do not match.",
                },
            ];
        }

        return [];
    },
    async submit(output) {
        loading.value = true;

        const reg = await api.auth.register.start({
            query: { token: token! },
        });

        if (!reg.data) {
            api.error(reg.error, reg.response, { handle401: "api-message" });
            router.push(redirect.build("/", "bad-invite"));
            return;
        }

        const k1 = await crypto.invite.decryptk1(
            k3!,
            hex.asbytes(reg.data!.k2),
        );

        if (!k1) {
            toast.error(
                "Failed to decrypt master key. You will need a new invite.",
            );
            setTimeout(() => router.push("/"), 4000);
            return;
        }

        const end = () => {
            setTimeout(() => (loading.value = false), 500); // prevent flashing the spinner
        };

        const k1e = await crypto.k1.encrypt(k1!, output.password);

        if (!k1e) {
            toast.error("Failed to encrypt master key. Please try again.");
            return end();
        }

        const { v, s } = await srp.register(output.username, output.password);

        const res = await api.auth.register.finish({
            body: {
                token: token!,
                username: output.username,
                k1e,
                v: hex.from(v),
                s: hex.from(s),
            },
        });

        if (res.error) {
            api.error(res.error, res.response);
            return end();
        }

        router.push(redirect.build("/", "invite-success"));
    },
});
</script>

<template>
    <div :class="cn('content', loading && 'justify-center')">
        <span class="title">Create Account</span>
        <Form v-if="!loading" :form class="item" v-model:loading="loading" />
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.content {
    @apply flex flex-col;
    @apply items-center gap-4 p-2;

    @apply md:w-[32rem] lg:w-[52rem];
    @apply h-md:md:rounded-lg h-md:md:bg-card;
}

.title {
    @apply mt-4 mb-4 text-2xl select-none;
}

:deep(.item) {
    @apply md:w-96 lg:w-[32rem];
}

:deep(.submit) {
    @apply mt-6;
}
</style>
