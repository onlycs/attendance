<script setup lang="ts">
import type { SlotSize } from "./Slot.vue";

export interface OTPFieldProps {
    length: number;
    regex: string;
    mobile?: "text" | "numeric";
    password?: boolean;
    size?: SlotSize;
}

defineProps<OTPFieldProps>();
defineModel<string>("otp", { required: true });
</script>

<template>
    <OTPInput
        #default="{ slots }"
        :maxlength="$props.length"
        :inputmode="$props.mobile"
        :pattern="$props.regex"
        :type="$props.password ? 'password' : undefined"
        autocomplete="off"
        spellcheck="false"
        :model-value="otp"
        @update:model-value="(val) => $emit('update:otp', val)"
    >
        <div class="flex">
            <OTPSlot
                v-for="(slot, idx) of slots"
                v-bind="slot"
                :key="idx"
                :size="$props.size ?? 'md'"
                :hidden="$props.password"
            />
        </div>

        <slot />
    </OTPInput>
</template>
