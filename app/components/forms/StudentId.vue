<script setup lang="ts">
import { REGEXP_ONLY_DIGITS as Numeric } from "vue-input-otp";
import type { SlotSize } from "../ui/input-otp/Slot.vue";

const LENGTH = 5;

export interface IdSubmitEvent {
    id: string;
}

const props = defineProps<{ size?: SlotSize; loading?: boolean; }>();
const emit = defineEmits<{ submit: [ev: IdSubmitEvent]; }>();

const id = ref("");

const icon = {
    sm: "max-md:size-4 size-6",
    md: "max-md:size-6 size-8",
    lg: "max-md:size-8 size-12",
}[props.size ?? "md"];

watch(id, (studentId) => {
    if (studentId.length !== LENGTH) {
        return;
    }

    emit("submit", { id: studentId });
    id.value = "";
});
</script>

<template>
    <OTPInput
        v-slot="{ slots }"
        v-model="id"
        :maxlength="LENGTH"
        inputmode="text"
        :pattern="Numeric"
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
@reference "~/style/tailwind.css";

.icon {
    @apply absolute right-0 top-1/2 -translate-y-1/2
        translate-x-[calc(100%+1rem)];
}
</style>
