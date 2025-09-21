<script setup lang="ts">
import type { SlotSize } from "../ui/input-otp/Slot.vue";

const props = defineProps<{ size?: SlotSize; loading?: boolean }>();
const emit = defineEmits<{ submit: [id: string] }>();

const id = ref("");
const size = toRef(props, "size");

const icon = {
	sm: "max-md:size-4 size-6",
	md: "max-md:size-6 size-8",
	lg: "max-md:size-8 size-12",
}[props.size ?? "md"];

watch(id, (value) => {
	if (value.length === 5) {
		emit("submit", value);
		id.value = "";
	}
});
</script>

<template>
    <OTPInput v-slot="{ slots }" v-model="id" :maxlength="5">
        <div class="flex">
            <OTPSlot
                v-for="(slot, idx) in slots"
                v-bind="slot"
                :key="idx"
                :size="size"
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
