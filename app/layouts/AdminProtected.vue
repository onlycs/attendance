<script setup lang="ts">
import type { AuthData } from "~/plugins/auth";
import { f } from "~/utils/form";
import DefaultLayout from "./Default.vue";

const { auth, user } = useAuth();
const router = useRouter();

const creds = computed<typeof user["value"] & { role: "admin"; }>(() => {
    if (user.value.role !== "admin") return {} as any; // we immediately redirect elsewhere
    return { ...user.value };
});

const open = ref(false);
const loading = ref(false);
const promise = ref((_a: AuthData & { role: "admin"; ok: true; }) => {});
const route = useRoute();

function exit(
    usr: typeof user["value"] = user.value,
): usr is typeof user["value"] & { role: "admin"; } {
    usr = user.value;

    if (user.value.role === "admin" && user.value.ok) {
        const exp = user.value.claims.exp;
        const now = Math.floor(Date.now() / 1000);
        if (exp > now) return true;
    }

    auth.clear();
    router.push(redirect.build("/", "session-expired"));
    return false;
}

watch(open, open => {
    if (open) loading.value = false;
});

watch(
    () => route.path,
    async () => {
        await sleep(10);

        if (
            user.value.role !== "admin"
            || user.value.claims.exp < Math.floor(Date.now() / 1000)
        ) return exit();

        if (user.value.ok) return;

        open.value = true;
    },
    { immediate: true },
);

async function submit(password: string) {
    loading.value = true;
    const res = await auth.admin(creds.value.claims.username, password);

    if (res.ok) {
        promise.value(user.value as AuthData & { role: "admin"; ok: true; });
        promise.value = () => {};
        open.value = false;
        return;
    }

    setTimeout(() => loading.value = false, 500); // prevent flashing the spinner
}

onMounted(() => {
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") exit();
    });
});

const form = computed(() => {
    return f.form({
        items: {
            password: f.password.current({
                title: "Password",
                "class:container": "password",
            }),
        },
        buttons: [
            {
                form: "submit",
                label: "Continue",
                kind: "primary",
            },
            {
                form: "cancel",
                label: `Not ${creds.value?.claims?.username ?? "you"}?`,
                kind: "secondary-card",
            },
        ],
        submit: (submission) => submit(submission.password),
        cancel: () => exit(),
    });
});
</script>

<template>
    <DefaultLayout ref="layout">
        <div class="page">
            <Sidebar />

            <div class="content">
                <slot />
            </div>
        </div>

        <Drawer v-model:open="open" @close="exit">
            <div class="title">
                Enter Password to Continue
            </div>

            <div class="form">
                <Form
                    :form
                    v-model:loading="loading"
                />
            </div>
        </Drawer>
    </DefaultLayout>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.title {
    @apply text-xl md:text-2xl;
}

.form {
    @apply mt-8 gap-2 flex flex-col items-center;
    @apply md:w-[32rem] lg:w-[38rem] max-w-full;
}

.form :deep(.item.password) {
    @apply mb-4;
}

.page {
    display: grid;
    grid-template-columns: auto 1fr;

    @apply w-full h-full p-2 gap-2;
}

.content {
    @apply flex-1 overflow-hidden;
    @apply flex flex-col justify-center items-center;
    @apply bg-background;
    @apply w-full;
}
</style>
