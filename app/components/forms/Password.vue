<script setup lang="ts">
import type { Temporal } from "temporal-polyfill";
import { SRPClientSession, SRPParameters, SRPRoutines } from "tssrp6a";
import { REGEXP_ONLY_DIGITS_AND_CHARS as Alphanumeric } from "vue-input-otp";
import { api, apiDateTime, apiToast } from "~/utils/api";
import type { SlotSize } from "../ui/form/otp/Slot.vue";

const PASSWORD_LENGTH = 8;

export interface PasswordSubmitEvent {
    password: string;
    token: string;
    expires: Temporal.ZonedDateTime;
}

const props = defineProps<{ size?: SlotSize; }>();
const emit = defineEmits<{
    submit: [ev: PasswordSubmitEvent];
}>();
const auth = useAuth();

const password = ref("");

const started = ref(false);
const loading = computed(
    () => started.value && auth.admin.value.status !== "ok",
);

const icon = {
    sm: "max-md:size-4 size-6",
    md: "max-md:size-6 size-8",
    lg: "max-md:size-8 size-12",
}[props.size ?? "md"];

watch(password, async (password) => {
    if (password.length !== PASSWORD_LENGTH) {
        return;
    }

    started.value = true;

    const routines = new SRPRoutines(
        new SRPParameters(
            SRPParameters.PrimeGroup[2048],
            SRPParameters.H.SHA512,
        ),
    );

    const clientA = new SRPClientSession(routines);
    const clientB = await clientA.step1("admin", password);

    const start = await api("/auth/login/start", "post");

    if (start.isErr()) {
        apiToast(start.error);
        started.value = false;

        return;
    }

    const clientC = await clientB.step2(
        Crypt.fromHex(start.value.salt),
        Crypt.fromHex(start.value.b),
    );

    const finish = await api(
        "/auth/login/finish",
        "post",
        { a: Crypt.hex(clientC.A), m1: Crypt.hex(clientC.M1) },
    );

    if (finish.isErr()) {
        apiToast(finish.error);
        return;
    }

    await clientC.step3(Crypt.fromHex(finish.value.m2));

    if (auth.admin.value.status === "pending-password") {
        auth.admin.value.reset(
            password,
            finish.value.token,
            apiDateTime(finish.value.expires),
        );
    }

    if (auth.admin.value.status === "pending-all") {
        auth.admin.value.set(
            password,
            finish.value.token,
            apiDateTime(finish.value.expires),
        );
    }

    emit("submit", {
        password: password,
        token: finish.value.token,
        expires: apiDateTime(finish.value.expires),
    });
});
</script>

<template>
    <OTPField
        :length="PASSWORD_LENGTH"
        :regex="Alphanumeric"
        :size="$props.size"
        v-model:otp="password"
        mode="text"
        password
    >
        <Icon
            v-if="loading"
            name="svg-spinners:ring-resize"
            :class="cn('icon', icon)"
            :customize="Customize.StrokeWidth(1.75)"
            mode="svg"
        />
    </OTPField>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.icon {
    @apply absolute right-0 top-1/2 -translate-y-1/2
        translate-x-[calc(100%+1rem)];
}
</style>
