<script setup lang="ts">
import { useAuth } from "~/utils/auth";
import DefaultLayout from "./Default.vue";

const auth = useAuth();
const ok = ref(false);
const forceClose = ref(false);
const isMobile = useMobile();
const router = useRouter();
const app = useNuxtApp();
const layout = ref<InstanceType<typeof DefaultLayout>>();

function redirect() {
    if (ok.value) return;

    forceClose.value = true;

    layout.value?.transition.out.trigger().then(() => {
        auth.clear();
        router.push("/");
    });
}

function check() {
    forceClose.value = false;

    const path = router.currentRoute.value.path;
    const skippable = /^\/attendance\/(.+)$/.test(path);
    if (skippable && ok.value) return;

    ok.value = auth.admin.value.status === "ok";
}

app.hook("page:finish", () => check());
watch(
    auth.admin,
    (admin) => {
        if (admin.status === "ok") check();
    },
    { immediate: true },
);
onMounted(check);

onMounted(() => {
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") redirect();
    });
});
</script>

<template>
    <DefaultLayout ref="layout">
        <slot />

        <Drawer
            :open="!ok && !forceClose"
            @close="redirect"
        >
            <div class="title">
                Enter Password to Continue
            </div>

            <div class="form">
                <SizeDependent>
                    <FormPassword
                        :size="isMobile
                        ? 'md'
                        : 'lg'"
                    />
                </SizeDependent>
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
    @apply my-8;
}
</style>
