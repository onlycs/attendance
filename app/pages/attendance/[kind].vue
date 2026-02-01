<script setup lang="ts">
import { toast } from "vue-sonner";
import api, { type HourType } from "~/utils/api";

definePageMeta({ layout: "admin-protected" });

const route = useRoute();
const router = useRouter();
const { user, auth } = useAuth();

const kind = route.params.kind as HourType; // note: validated below

// dprint-ignore
const error: RedirectToast | undefined = await (async () => {
    if (user.value.role !== "admin") return "session-expired";
    if (user.value.claims.perms.roster !== true) return "unauthorized";
    if (typeof kind !== "string") return "404";
    if (!["build", "learning", "demo", "offseason"].includes(kind)) return "404";
    if (!await api.roster.allowed().then(res => !res.data || res.data.includes(kind))) return "404";
    return undefined;
})();

if (error) {
    router.push(redirect.build("/", error));
    throw new Error("Redirecting...");
}

const creds = ref<typeof user["value"] & { role: "admin"; ok: true; }>(null!);

watch(user, user => {
    if (user.role !== "admin") return;
    if (!user.ok) return;
    creds.value = { ...user };
}, { immediate: true });

const title = {
    build: "Build Season",
    learning: "Learning Days",
    demo: "Outreach Hours",
    offseason: "Offseason",
}[kind];

const otp = ref("");
const currentId = ref("");
const forceOpen = ref(false);
const newOpen = ref(false);

async function roster(id?: string, force = false) {
    if (id) currentId.value = id;
    else id = currentId.value;

    if (!id) {
        toast.error("Something went wrong. Please try again.");
        return;
    }

    const res = await api.roster.swipe({
        body: {
            sid_hashed: sha256(id),
            kind,
            force,
            issuer: creds.value.claims.sub,
            totp: otp.value,
        },
    });

    if (!res.data) {
        if (res.response?.status === 404) {
            return newOpen.value = true;
        }

        return api.error(res.error, res.response);
    }

    if (res.data === "denied") {
        return forceOpen.value = true;
    }

    const io = res.data.replace("log", "");
    toast.success(`Successfully signed ${io}!`);

    currentId.value = "";
}

watch(currentId, (currentId, last) => {
    if (
        currentId.length == studentId.length && last.length < studentId.length
    ) {
        roster();
    }
});

const studentId = f.studentId({ size: "lg" });

useCleanup().add(auth.clearsession);
</script>

<template>
    <div class="header page-transition">
        {{ title ?? "Attendance" }}
    </div>

    <div class="content">
        <div class="form">
            <div>
                <label class="label">
                    Student ID
                </label>
                <OTPField
                    v-bind="studentId"
                    v-model:otp="currentId"
                />
            </div>
        </div>

        <AttendanceTotp :kind v-model:code="otp" />
    </div>

    <AttendanceNewStudent
        :currentId
        @retry="() => roster()"
        v-model:open="newOpen"
    />

    <AttendanceForceOut
        @retry="() => roster(undefined, true)"
        @cancel="() => currentId = ''"
        v-model:open="forceOpen"
    />
</template>

<style scoped>
@reference "~/style/tailwind.css";

.form {
    grid-row: span 2;

    @apply relative flex flex-col items-center justify-center;
    @apply bg-drop rounded-md;
    @apply max-md:w-full md:w-[24rem] lg:w-[32rem] xl:w-[36rem];
    @apply max-md:h-[32rem] md:h-[20rem] lg:h-[24rem] xl:h-[28rem];

    .label {
        @apply text-sub text-sm ml-2 mb-0.5;
    }
}

.content {
    display: grid;
    grid-template-columns: auto auto auto;
    grid-template-rows: 1fr auto;

    @apply gap-2;
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
