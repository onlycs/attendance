<script setup lang="ts">
import { REGEXP_ONLY_DIGITS_AND_CHARS as Alphanumeric } from "vue-input-otp";
import type { SlotSize } from "../ui/input-otp/Slot.vue";

const PASSWORD_LENGTH = 8;

export interface PasswordSubmitEvent {
	password: string;
	token: string;
	expires: Date;
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

watch(password, (value) => {
	if (value.length !== PASSWORD_LENGTH) return;

	loading.value = true;

	ApiClient.alias("login", {
		password: value,
	}).then((data) => {
		if (data.isErr()) {
			apiToast(data.error);
			loading.value = false;
			return;
		}

		emit("submit", {
			password: value,
			token: data.value.token,
			expires: new Date(data.value.expires),
			stopLoading: () => {
				loading.value = false;
			},
		});
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
