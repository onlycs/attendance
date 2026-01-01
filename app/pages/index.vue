<script setup lang="ts">
import { toast } from "vue-sonner";

const messages = {
    "session-expired": "Your session has expired. Please log in again.",
    onboard: "Onboard success! Please sign in.",
} as const;

const status = {
    "session-expired": "error",
    onboard: "success",
} as const;

const route = useRoute();
const message = route.query.throw as keyof typeof messages | undefined;
if (message && messages[message]) {
    toast[status[message]](messages[message]);
    route.query.throw = null;
}

const { auth } = useAuth();
const router = useRouter();
const loading = ref(false);

const { form, buttons, deps } = f.form(
    {
        who: f.select({
            schema: {
                student: "Student",
                admin: "Admin",
            },
            default: "admin",
            "class:container": "select",
        }),
        username: f.username({
            "class:container": "username",
        }),
        password: f.password({
            "class:container": "password",
        }),
        studentid: f.studentId({
            size: "lg",
            "class:container": "studentid",
        }),
    },
    [
        {
            form: "submit",
            label: "Continue",
            class: "submit",
            kind: "primary",
        },
    ],
    {
        username: {
            who: "admin",
        },
        password: {
            who: "admin",
        },
        studentid: {
            who: "student",
        },
    },
);

function end() {
    setTimeout(() => {
        loading.value = false;
    }, 500); // prevent flashing the spinner
}

async function submit(output: FormOutput<typeof form, typeof deps>) {
    loading.value = true;

    if (output.who === "admin") {
        const { ok } = await auth.admin(output.username, output.password);

        if (!ok) return end();
        router.push("/dashboard");
    } else {
        toast.warning("Student login is not implemented yet.");
    }
}
</script>
<template>
    <Require
        :redirects="{
            '/dashboard': () => $user.value.role === 'admin',
            '/attendance': () => $user.value.role === 'student',
        }"
    />
    <div :class="cn('content', loading && 'justify-center')">
        <Form
            v-if="!loading"
            :form
            :buttons
            :deps
            class="item"
            @submit="submit"
        />
        <Spinner v-else class="spinner" />
    </div>
</template>
<style scoped>
@reference "~/style/tailwind.css";

.content {
    @apply flex flex-col;
    @apply items-center p-2;

    /* desktop styles (md or above) */
    @apply md:w-[32rem] lg:w-[52rem];
    @apply h-md:min-h-[24rem] h-lg:min-h-[34rem];
    @apply h-md:md:bg-card h-md:md:rounded-lg;
    @apply h-md:gap-6 h-lg:gap-12;

    /* mobile styles (below md) */
    @apply max-md:w-full max-md:h-full;
    @apply max-h-md:w-full max-h-md:h-full;
}

.spinner {
    @apply size-32;
}
</style>
<style>
@reference "~/style/tailwind.css";

.content {
    > .item {
        &:not(.select) {
            flex: 1 0 0;
            @apply max-md:w-[80%] md:w-96 lg:w-[32rem];
        }

        &.select {
            flex: 0 0 auto;
        }

        &.studentid {
            @apply justify-center w-fit!;
        }

        &.username {
            @apply justify-end;
        }

        &.password {
            @apply justify-start;
        }
    }

    > .submit {
        flex: 0 0 auto;
    }
}
</style>
