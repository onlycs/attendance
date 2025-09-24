<script setup lang="ts">
import type { Temporal } from "temporal-polyfill";
import {
	createVerifierAndSalt,
	SRPClientSession,
	SRPParameters,
	SRPRoutines,
} from "tssrp6a";
import { REGEXP_ONLY_DIGITS_AND_CHARS as Alphanumeric } from "vue-input-otp";
import { ApiClient, apiToast } from "~/utils/api";
import type { SlotSize } from "../ui/input-otp/Slot.vue";

const PASSWORD_LENGTH = 8;

export interface PasswordSubmitEvent {
	password: string;
	token: string;
	expires: Temporal.ZonedDateTime;
	stopLoading: () => void;
}

const props = defineProps<{ size?: SlotSize }>();
const emit = defineEmits<{ submit: [PasswordSubmitEvent] }>();

const password = ref("");
const loading = ref(false);

const icon = {
	sm: "max-md:size-4 size-6",
	md: "max-md:size-6 size-8",
	lg: "max-md:size-8 size-12",
}[props.size ?? "md"];

watch(password, async (value) => {
	if (value.length !== PASSWORD_LENGTH) return;

	loading.value = true;

	const routines = new SRPRoutines(
		new SRPParameters(SRPParameters.PrimeGroup[2048], SRPParameters.H.SHA512),
	);

	const clientA = new SRPClientSession(routines);
	const clientB = await clientA.step1("admin", value);

	const start = await ApiClient.fetch("login/start", undefined);

	if (start.isErr()) {
		apiToast(start.error);
		loading.value = false;
		return;
	}

	const clientC = await clientB.step2(
		Crypt.fromHex(start.value.salt),
		Crypt.fromHex(start.value.b),
	);

	const finish = await ApiClient.fetch("login/finish", {
		a: Crypt.hex(clientC.A),
		m1: Crypt.hex(clientC.M1),
	});

	if (finish.isErr()) {
		apiToast(finish.error);
		loading.value = false;
		return;
	}

	await clientC.step3(Crypt.fromHex(finish.value.m2));

	emit("submit", {
		password: value,
		token: finish.value.token,
		expires: finish.value.expires,
		stopLoading: () => {
			loading.value = false;
		},
	});
});
</script>

<template>
	<OTPInput
		v-slot="{ slots }"
		v-model="password"
		:maxlength="PASSWORD_LENGTH"
		inputmode="text"
		:pattern="Alphanumeric"
		type="password"
		autocomplete="off"
		spellcheck="false"
	>
		<div class="flex">
			<OTPSlot
				v-for="(slot, idx) in slots"
				v-bind="slot"
				:key="idx"
				:size="$props.size"
				hidden
			/>
		</div>
		<Icon 
			v-if="loading"
			name="svg-spinners:ring-resize" 
			:class="cn('icon', icon)" 
			:customize="Customize.StrokeWidth(1.75)" 
			mode="svg" 
		/>
	</OTPInput>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.icon {
	@apply absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+1rem)];
}
</style>
