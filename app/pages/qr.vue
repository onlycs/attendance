<script setup lang="ts">
import { toast } from "vue-sonner";
import api, { type HourType, type SwipeAction } from "~/utils/api";
import { f } from "~/utils/form";

const route = useRoute();
const expired = ref(false);

const q = {
    code: route.query.code as string | null,
    issuer: route.query.issuer as string | null,
    kind: route.query.kind as HourType | null,
    exp: route.query.exp as string | null,
};

if (
    !q.code ||
    !q.issuer ||
    !q.kind ||
    !q.exp ||
    q.exp.match(/^\d+$/) === null ||
    !["build", "learning", "demo", "offseason"].includes(q.kind)
) {
    useRouter().push(redirect.build("/", "bad-qr"));
    throw new Error("Redirecting...");
}

const now = Math.floor(Date.now() / 1000);
const dt = ref(parseInt(q.exp, 10) - now);

const { code, issuer, kind } = q as UnPartial<typeof q>;
const { auth, user } = useAuth();

const studentId = ref<string | null>(null);
const currentId = ref("");
const form = f.studentId({ size: "lg" });

watch(
    user,
    (user) => {
        if (user.role !== "student") {
            currentId.value = "";
            studentId.value = null;
            return;
        }

        studentId.value = user.id;
    },
    { immediate: true },
);

watch(currentId, (current, last) => {
    const len = current.length === form.props.length;
    const oldlen = last.length < form.props.length;
    if (len && oldlen) auth.student(current);
});

const prompt = ref(false);

async function roster(via: SwipeAction, id?: string, force = false) {
    if (id) studentId.value = id;
    else id = studentId.value ?? undefined;

    if (!id) {
        prompt.value = true;
        return;
    }

    const res = await api.roster.swipe({
        body: {
            sid_hashed: sha256(id),
            kind,
            force,
            issuer,
            totp: code,
        },
    });

    if (!res.data) {
        if (res.response?.status === 404) {
            return toast.warning(
                "You don't exist yet! Please sign in on the computer your first time!",
            );
        }

        return api.error(res.error, res.response, {
            handle401: { message: "Expired QR code. Scan again?" },
        });
    }

    if (res.data === "denied") {
        prompt.value = true;
        return;
    }

    if (res.data === "ignored") {
        const io = via.replace("log", "");
        return toast.info(`You are already signed ${io}`);
    }

    const io = res.data.replace("log", "");
    toast.success(`Successfully signed ${io}!`);
}
</script>

<template>
    <template v-if="expired">
        <Icon name="hugeicons:square-lock-01" class="icon grey" />
        <span class="desc">
            QR code expired
            <br />
            Scan again?
        </span>
    </template>

    <template v-else-if="!studentId">
        <div>
            <span class="sub">Student ID</span>
            <OTPField
                v-bind="form.props"
                v-model="currentId"
                v-if="!studentId"
            />
        </div>
    </template>

    <template v-else>
        <div class="wrapper">
            <Button class="small" kind="warning" @click="$auth.clear">
                <Icon name="hugeicons:user-edit-01" class="icon" />
            </Button>
            <Button class="big login" kind="secondary" @click="roster('login')">
                <Icon name="hugeicons:login-01" class="icon green" />
            </Button>
            <Button class="big" kind="secondary" @click="roster('logout')">
                <Icon name="hugeicons:logout-01" class="icon red" />
            </Button>
            <TimedProgress
                v-model:timer="dt"
                class="progress"
                :duration="55"
                @complete="() => (expired = true)"
            />
        </div>

        <AttendanceForceOut
            v-model:open="prompt"
            @retry="roster('login', undefined, true)"
            @cancel="prompt = false"
        />
    </template>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.wrapper {
    display: grid;
    grid-template-rows: auto 1fr 1fr auto;

    @apply h-full w-full;
    @apply gap-2 p-2;
}

.progress {
    @apply w-full!;
}

.big {
    @apply h-full! w-full rounded-lg! bg-drop!;
}

.small {
    @apply h-full! w-full;
}

.icon {
    @apply h-16 w-16;

    &.green {
        @apply text-green-500;
    }

    &.red {
        @apply text-red-500;
    }

    &.grey {
        @apply text-sub;
    }
}

.sub {
    @apply relative ml-2 text-xs text-sub;
}

.desc {
    @apply mt-2 text-center text-sub select-none;
}
</style>
