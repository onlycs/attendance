<script setup lang="ts">
import { REGEXP_ONLY_DIGITS as Numeric } from "vue-input-otp";
import z from "zod";

defineModel<boolean>("open", { required: true });
defineEmits<{ submit: [id: string, first: string, last: string]; }>();

const Schema = z.object({
    id: z.string(),
    first: z
        .string()
        .min(2, "First name is required")
        .regex(/^[A-Z]/, "Must start with a capital letter")
        .regex(
            /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/,
            "May contain only letters, dashes, apostrophes, or spaces",
        ),
    last: z
        .string()
        .min(2, "Last name is required")
        .regex(/^[A-Z]/, "Must start with a capital letter")
        .regex(
            /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/,
            "May contain only letters, dashes, apostrophes, or spaces",
        ),
});
</script>

<template>
    <Drawer
        :open="$props.open"
        @close="() => $emit('update:open', false)"
    >
        <div class="title">New Student</div>

        <Form
            @cancel="() => $emit('update:open', false)"
            @submit="(ev) => {
                $emit('submit', ev.id, ev.first, ev.last);
                $emit('update:open', false);
            }"
            :schema="Schema"
            :meta="{
                id: {
                    title: 'Student ID',
                    type: 'otp',
                    otp: {
                        length: 5,
                        regex: Numeric,
                        size: 'sm',
                    },
                },
                first: {
                    title: 'First Name',
                    type: 'input',
                    placeholder: 'John',
                },
                last: {
                    title: 'Last Name',
                    type: 'input',
                    placeholder: 'Doe',
                },
            }"
        />
    </Drawer>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.title {
    @apply text-2xl mb-4;
}
</style>
