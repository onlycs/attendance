<script setup lang="ts">
import { zPlainDateInstance, zPlainTimeInstance } from "temporal-zod";
import z from "zod";

const Schema = z.object({
    date: zPlainDateInstance,
    student: z.string(),
    kind: z.string(),
    start: zPlainTimeInstance,
    end: zPlainTimeInstance,
});

export type AddDateSubmission = z.output<typeof Schema>;

defineProps<{ students: { [id: string]: string; }; }>();
defineModel<boolean>("open", { required: true });
defineEmits<{ submit: [s: AddDateSubmission]; }>();
</script>

<template>
    <Drawer
        :open="$props.open"
        @close="() => $emit('update:open', false)"
    >
        <div class="title">Custom Entry</div>

        <Form
            @cancel="() => $emit('update:open', false)"
            @submit="(ev) => {
                $emit('submit', ev);
                $emit('update:open', false);
            }"
            :schema="Schema"
            :meta="{
                date: {
                    title: 'Date',
                    type: 'date',
                },
                student: {
                    title: 'Student',
                    type: 'union',
                    union: {
                        options: $props.students,
                    },
                },
                kind: {
                    title: 'Kind',
                    type: 'select',
                    select: {
                        options: {
                            demo: 'Outreach',
                            offseason: 'Offseason',
                            learning: 'Learning',
                            build: 'Build',
                        },
                    },
                },
                start: {
                    title: 'Start Time',
                    type: 'time',
                },
                end: {
                    title: 'End Time',
                    type: 'time',
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
