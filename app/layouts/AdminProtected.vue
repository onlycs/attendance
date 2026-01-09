<script setup lang="ts">
import type { AuthData } from "~/plugins/auth";
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

function exit(force?: boolean) {
    if (!open.value && !force) return;
    open.value = false;
    auth.clear();
    redirect("/", router, { throw: "session-expired" });
}

watch(user, () => {
    if (user.value.role !== "admin") return exit(true);
    if (user.value.ok) return open.value = false;

    const exp = user.value.claims.exp;
    const now = Math.floor(Date.now() / 1000);
    if (exp < now) return exit();

    open.value = true;
}, { immediate: true });

watch(open, open => {
    if (open) loading.value = false;
});

auth.prompt.provide(() => {
    const p = new Promise<AuthData & { role: "admin"; ok: true; }>((res) => {
        promise.value = res;
    });

    if (user.value.role !== "admin") {
        exit(true);
        return p;
    }

    if (user.value.ok) {
        promise.value(user.value);
        return p;
    }

    open.value = true;
    return p;
});

async function submit(password: string) {
    loading.value = true;
    const res = await auth.admin(creds.value.claims.username, password);

    if (res.ok) {
        promise.value(user.value as AuthData & { role: "admin"; ok: true; });
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

const form = {
    password: f.password.current({
        title: "Password",
        "class:container": "password",
    }),
};

const buttons = computed(() => {
    return [
        {
            form: "submit",
            label: "Continue",
            kind: "primary",
        },
        {
            form: "cancel",
            label: `Not ${creds.value.claims.username ?? "you"}?`,
            kind: "secondary-card",
        },
    ] satisfies FormButton[];
});

const deps = {};
</script>

<template>
    <DefaultLayout ref="layout">
        <div class="page">
            <Sidebar />

            <div class="content">
                <slot />
            </div>
        </div>

        <Drawer :open @close="exit">
            <div class="title">
                Enter Password to Continue
            </div>

            <div class="form">
                <Form
                    :form
                    :buttons
                    :deps
                    v-model:loading="loading"
                    @submit="submit($event.password)"
                    @cancel="exit"
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

    @apply w-full h-full p-2;
}

.content {
    @apply flex-1 overflow-hidden;
    @apply flex flex-col justify-center items-center;
    @apply bg-background;
    @apply w-full;
}
</style>
