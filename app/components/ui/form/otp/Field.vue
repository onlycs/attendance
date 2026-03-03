<script setup lang="ts">
import {
    REGEXP_ONLY_DIGITS as Numeric,
    REGEXP_ONLY_DIGITS_AND_CHARS as Text,
} from "vue-input-otp";
import type { OTPSlotProps } from "./Slot.vue";

export type OTPFieldProps = {
    length: number;
    type: "text" | "numeric";
    password?: boolean;
} & Omit<OTPSlotProps, "isActive" | "char" | "hasFakeCaret" | "hidden">;

defineProps<OTPFieldProps>();
defineModel<string>({ required: true });
</script>

<template>
    <OTPInput
        #default="{ slots }"
        :maxlength="$props.length"
        :inputmode="$props.type ?? 'numeric'"
        :pattern="$props.type === 'numeric' ? Numeric : Text"
        :model-value="modelValue ?? ''"
        @update:model-value="(val) => $emit('update:modelValue', val)"
        autocomplete="off"
        spellcheck="false"
    >
        <div class="slotcontainer">
            <OTPSlot
                v-for="(slot, idx) of slots"
                v-bind="{ ...slot, ...$props }"
                :key="idx"
                :hidden="$props.password"
            />
        </div>

        <slot />
    </OTPInput>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.slotcontainer {
    @apply flex gap-2;
}
</style>
