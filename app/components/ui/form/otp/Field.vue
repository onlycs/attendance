<script setup lang="ts">
import { mode } from "crypto-js";
import {
    REGEXP_ONLY_DIGITS as Numeric,
    REGEXP_ONLY_DIGITS_AND_CHARS as Text,
} from "vue-input-otp";
import type { SlotSize } from "./Slot.vue";

export interface OTPFieldProps {
    length: number;
    type: "text" | "numeric";
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
        :inputmode="$props.type ?? 'numeric'"
        :pattern="$props.type === 'numeric' ? Numeric : Text"
        :model-value="otp ?? ''"
        @update:model-value="(val) => $emit('update:otp', val)"
        autocomplete="off"
        spellcheck="false"
    >
        <div class="slotcontainer">
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

<style scoped>
@reference "~/style/tailwind.css";

.slotcontainer {
    @apply flex gap-2;
}
</style>
