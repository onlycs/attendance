<script setup lang="ts">
import Qr from "qr-code-styling";
import { toast } from "vue-sonner";
import api, { type HourType, type TotpResponse } from "~/utils/api";

const { user } = useAuth();
const crypto = useCrypto();
const code = defineModel<string>("code", { required: true });
const totp = ref<TotpResponse | null>(null);
const issuer = ref<string | null>(null);
const props = defineProps<{ kind: MaybeRef<HourType> }>();
const kind = computed(() => unref(props.kind));

watch(
    [user, kind],
    ([creds, kind]) => {
        if (creds.role !== "admin" || !creds.ok) {
            totp.value = null;
            return;
        }

        issuer.value = creds.claims.sub;
        api.roster
            .totp({
                body: { hour_type: kind },
            })
            .then((res) => {
                if (!res.data) {
                    return api.error(res.error, res.response);
                }

                if (user.value.role !== "admin" || !user.value.ok) {
                    totp.value = null;
                    return;
                }

                totp.value = res.data;
            });
    },
    { immediate: true },
);

if (!totp) {
    useRouter().push(redirect.build("/dashboard"));
    throw new Error("Redirecting...");
}

const timer = ref(30);
const refresh = async () => {
    timer.value = 30;

    if (!totp.value) return;
    const gen = await crypto.totp(totp.value.secret);

    if (!gen) {
        code.value = "";
        toast.error("Failed to generate TOTP code. Please try again.");
        return;
    }

    code.value = gen;
};

watch(totp, refresh);

const qr = ref<string | null>(null);

watch(
    [code, issuer, totp, kind],
    async ([code, issuer, totp, kind]) => {
        if (!totp || !issuer || code === "") {
            qr.value = null;
            return;
        }

        const { host, protocol: proto } = window.location;
        const now_sec = Math.floor(Date.now() / 1000);
        const exp = now_sec + timer.value + 25; // could+should be +30, but I want a server buffer

        const blob = (await new Qr({
            width: 512,
            height: 512,
            data: `${proto}//${host}/qr?code=${code}&issuer=${issuer}&kind=${kind}&exp=${exp}`,
            dotsOptions: {
                color: "#fff",
                type: "rounded",
            },
            cornersDotOptions: { color: "#fff" },
            cornersSquareOptions: { color: "#fff" },
            backgroundOptions: { color: "#171717" },
        }).getRawData("png")) as Blob | null;

        if (!blob) return;
        if (qr.value) URL.revokeObjectURL(qr.value);

        qr.value = URL.createObjectURL(blob);
    },
    { immediate: true },
);

onMounted(refresh);
</script>

<template>
    <template v-if="qr">
        <div class="vline" />

        <NuxtImg :src="qr" alt="TOTP QR Code" class="qr" />

        <TimedProgress
            v-model:timer="timer"
            :duration="30"
            @complete="refresh"
            class="progress"
        />
    </template>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.vline {
    grid-row: span 2;
    @apply mx-2 w-px rounded-md bg-border;
}

.progress {
    @apply w-full;
}

.qr {
    @apply h-full rounded-md;
}
</style>
