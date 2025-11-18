<script setup lang="ts">
import type { FocusCard } from "#components";
import { toast } from "vue-sonner";
import { z } from "zod";
import { ApiClient, apiToast } from "~/utils/api";

definePageMeta({ layout: "admin-protected" });

const { $gsap } = useNuxtApp();

const route = useRoute();
const router = useRouter();
const transition = injectTransition();

const screenSize = useScreenSize();
const mobile = useMobile(screenSize);
const auth = useAuth();

const creds = ref<{ token: string; password: string; } | null>(null);
const kind = route.params.kind as "build" | "learning" | "demo";

const size = computed(() => [64, 32, 48, 52, 64][screenSize.value]);
const backIcon = computed(
    () => ["arrow-up-01", "arrow-left-01"][+!mobile.value],
);
const title = {
    build: "Build Hours",
    learning: "Learning Days",
    demo: "Outreach Hours",
    offseason: "Offseason Hours",
}[kind];

const loading = ref(false);
const currentId = ref("");
const back = ref<InstanceType<typeof FocusCard>>();
const main = ref<HTMLDivElement>();

/// New Student Form
const NewFormSchema = z.object({
    first: z
        .string()
        .min(2, "First name is required")
        .regex(/^[A-Z]/, "Must start with a capital letter")
        .regex(/^([A-Za-z]|-)+$/, "Must only contain letters or dashes"),
    last: z
        .string()
        .min(2, "Last name is required")
        .regex(/^[A-Z]/, "Must start with a capital letter")
        .regex(/^([A-Za-z]|-)+$/, "Must only contain letters or dashes"),
});

const NewFormOpen = ref(false);

function NewFormClose() {
    if (!NewFormOpen.value) return;

    NewFormOpen.value = false;
    loading.value = false;

    toast.warning("Cancelled! You were not signed in!");
}

async function NewFormSubmit(data: z.infer<typeof NewFormSchema>) {
    NewFormOpen.value = false;

    const idCrypt = await Crypt.encrypt(currentId.value, creds.value!.password);
    const firstCrypt = await Crypt.encrypt(data.first, creds.value!.password);
    const lastCrypt = await Crypt.encrypt(data.last, creds.value!.password);

    const res = await ApiClient.fetch(
        "student/add",
        {
            id: idCrypt,
            hashed: Crypt.sha256(currentId.value),
            first: firstCrypt,
            last: lastCrypt,
        },
        { headers: { Authorization: creds.value!.token } },
    );

    if (res.isErr()) {
        return apiToast(res.error, { redirect401: redirect });
    }

    roster(undefined, true);
}

/// Force Sign Out Form
const ForceFormOpen = ref(false);

function ForceFormClose() {
    if (!ForceFormOpen.value) return;

    ForceFormOpen.value = false;
    loading.value = false;

    toast.warning("Cancelled! You were not signed out!");
}

function ForceFormSubmit() {
    ForceFormOpen.value = false;
    roster(undefined, true);
}

async function roster(id?: string, force = false) {
    loading.value = true;

    if (id) currentId.value = id;
    else id = currentId.value;

    if (!id) {
        toast.error("Something went wrong. Please try again.");
        loading.value = false;
        return;
    }

    const info = await ApiClient.fetch("student/info", {
        params: { id: Crypt.sha256(id) },
    });

    if (info.isErr() && !force) {
        loading.value = false;
        return apiToast(info.error, {
            handle: {
                [404]: () => {
                    NewFormOpen.value = true;
                    loading.value = true;
                },
            },
        });
    }

    const res = await ApiClient.fetch(
        "roster",
        { id: Crypt.sha256(id), kind, force },
        { headers: { Authorization: creds.value!.token } },
    );

    if (res.isErr()) {
        loading.value = false;
        return apiToast(res.error, { redirect401: redirect });
    }

    if (res.value.denied) {
        ForceFormOpen.value = true;
        return;
    }

    toast.success(
        `Successfully signed ${res.value.action.replace("log", "")}!`,
    );
    loading.value = false;
}

function backHover() {
    if (mobile.value) return;
    if (!transition.ready) return;

    const target = back.value!.prim!;
    const bbox = target.getBoundingClientRect();

    $gsap.to(target, {
        width: `calc(${bbox.width}px + 2rem)`,
        x: "-1rem",
        ...Timing.in,
    });

    $gsap.to(main.value!, {
        x: "-1rem",
        ...Timing.in,
    });
}

function backUnhover() {
    if (mobile.value) return;
    if (!transition.ready) return;

    const target = back.value!.prim!;
    const bbox = target.getBoundingClientRect();

    $gsap.to(target, {
        width: `calc(${bbox.width}px - 2rem)`,
        x: "0rem",
        ...Timing.out,
    });

    $gsap.to(main.value!, {
        x: "0rem",
        ...Timing.out,
    });
}

function redirect(url: string) {
    transition.out.trigger({ reverse: true }).then(() => router.push(url));
}

function exit() {
    redirect("/attendance?reverse=true");
}

watch(
    auth.admin,
    (admin) => {
        if (admin.status !== "ok") return;

        creds.value = {
            token: admin.token.value.token,
            password: admin.password.value,
        };

        auth.clear();
    },
    { immediate: true },
);

onMounted(() => {
    transition.in.trigger();
});
</script>

<template>
    <div class="header page-transition">
        {{ title ?? "Attendance" }}
    </div>

    <div class="container">
        <FocusCards :animate="false" :length="1" show-text>
            <FocusCard
                ref="back"
                class="card"
                title="Back"
                :icon="`hugeicons:${backIcon}`"
                @mouseenter="backHover"
                @mouseleave="backUnhover"
                @click="exit"
            />
        </FocusCards>

        <div class="box" ref="main">
            <div class="textbox">
                <Icon
                    name="hugeicons:mortarboard-01"
                    :size
                    :customize="Customize.StrokeWidth(0.5)"
                    mode="svg"
                />
                Student ID
            </div>

            <div class="form-container">
                <SizeDependent>
                    <FormStudentId
                        :size="screenSize === 1 ? 'md' : 'lg'"
                        :loading
                        @submit="(ev) => roster(ev.id)"
                        autofocus
                    />
                </SizeDependent>
            </div>

            <div />
        </div>
    </div>

    <Drawer
        :open="ForceFormOpen"
        @close="ForceFormClose"
        class="dialog"
    >
        <div class="title">Are you sure?</div>

        You signed in less than three minutes ago

        <div class="buttons">
            <Button kind="error" @click="ForceFormSubmit">
                Sign me out!
            </Button>

            <Button kind="card-2" @click="ForceFormClose">
                Keep me in
            </Button>
        </div>
    </Drawer>

    <Drawer
        :open="NewFormOpen"
        @close="NewFormClose"
        class="dialog"
    >
        <div class="title">New Student</div>

        <Form
            @cancel="NewFormClose"
            @submit="NewFormSubmit"
            :schema="NewFormSchema"
            :meta="{
                first: {
                    title: 'First Name',
                    type: 'input',
                    placeholder: 'John',
                },
                last: {
                    title: 'Last Name',
                    type: 'input',
                    placeholder: 'Doe',
                },
            }"
        />
    </Drawer>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.container {
    @apply flex flex-col md:flex-row justify-center items-center;
    @apply gap-8;
}

.box {
    @apply relative bg-drop rounded-lg flex flex-col items-center;
    @apply max-md:w-[calc(100%-1.5rem)] md:w-[28rem] lg:w-[36rem] xl:w-[42rem]
        2xl:w-[48rem];
    @apply md:h-full h-[24rem];
}

.textbox {
    @apply flex justify-center items-center gap-6;
    @apply mt-8 text-xl md:text-lg lg:text-xl select-none;
}

.header {
    @apply absolute top-10;
    @apply text-4xl max-md:hidden;
    @apply select-none;
}

.form-container {
    @apply absolute top-1/2 left-1/2 -translate-x-1/2
        translate-y-[calc(-50%+1rem)];
}

.dialog {
    @apply h-72;

    .title {
        @apply mb-2 text-xl md:text-2xl;
    }

    .buttons {
        @apply flex flex-col gap-4;
        @apply w-full max-md:px-8 md:w-96 mt-8;

        button {
            @apply w-full;
        }
    }
}

.card {
    @apply w-[calc(100%-1.5rem)] md:w-36 lg:w-42 xl:w-52 2xl:w-60;
    @apply h-36 md:h-52 lg:h-72 xl:h-84 2xl:h-92;
}
</style>

<style>
@reference "~/style/tailwind.css";

.container > div.card-container {
    @apply max-md:w-full;
}
</style>
