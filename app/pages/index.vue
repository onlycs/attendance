<script setup lang="ts">
import { toast } from "vue-sonner";
import { f } from "~/utils/form";

const { auth } = useAuth();
const router = useRouter();
const loading = ref(false);
const mobile = useMobile();

const form = f.form(
    {
        items: {
            who: f.select(
                {
                    student: "Student",
                    admin: "Admin",
                },
                { "class:container": "select" },
            ),
            username: f.username({
                "class:container": "username",
            }),
            password: f.password.current({
                "class:container": "password",
            }),
            studentid: f.studentId({
                size: "lg",
                "class:container": "studentid",
            }),
        },
        buttons: [
            {
                form: "submit",
                label: "Continue",
                class: "submit",
                kind: "primary",
            },
        ],
        deps: {
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
        async submit(output) {
            const end = () => {
                setTimeout(() => {
                    loading.value = false;
                }, 500); // prevent flashing the spinner
            };

            loading.value = true;

            if (output.who === "admin") {
                const { ok } = await auth.admin(
                    output.username,
                    output.password,
                );

                if (!ok) return end();
                if (!mobile.value) router.push("/dashboard");
                else router.push("/attendance");
            } else {
                toast.warning("Student login is not implemented yet.");
            }
        },
    },
);
</script>
<template>
    <Require
        :redirects="{
            '/dashboard': () => $user.value.role === 'admin',
            '/student': () => $user.value.role === 'student',
        }"
    />
    <div :class="cn('content', loading && 'justify-center')">
        <Form
            :form
            v-model:loading="loading"
            class="item"
        />
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
