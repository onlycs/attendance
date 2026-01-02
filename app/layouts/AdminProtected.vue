<script setup lang="ts">
import DefaultLayout from "./Default.vue";

const { auth, user } = useAuth();
const router = useRouter();

const prompt = computed(() => user.value.role === "admin" && !user.value.ok);
const close = ref(false);
const open = computed(() => prompt.value && !close.value);
const uname = computed(() => {
    return user.value.role === "admin" ? user.value.claims.username : null;
});

function redirect() {
    if (!open.value) return;
    close.value = true;
    auth.clear();
    router.push("/?throw=session-expired");
}

onMounted(() => {
    if (user.value.role !== "admin") return redirect();

    const exp = user.value.claims.exp;
    const now = Math.floor(Date.now() / 1000);
    if (exp < now) return redirect();

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") redirect();
    });
});

const form = {
    password: f.password({
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
            label: `Not ${uname.value ?? "you"}?`,
            kind: "secondary-card",
        },
    ] satisfies FormButton[];
});

const deps = {};
</script>

<template>
    <DefaultLayout ref="layout">
        <slot />

        <Drawer :open @close="redirect">
            <div class="title">
                Enter Password to Continue
            </div>

            <div class="form">
                <Form
                    :form
                    :buttons
                    :deps
                    @submit="$auth.admin(uname!, $event.password)"
                    @cancel="redirect"
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
    @apply mt-8 gap-2 flex flex-col;
    @apply md:w-[32rem] lg:w-[38rem] max-w-full;
}
</style>

<style>
@reference "~/style/tailwind.css";

.form {
    > .item.password {
        @apply mb-4;
    }
}
</style>
