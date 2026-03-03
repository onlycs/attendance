<script setup lang="ts">
import type { StudentHoursResponse } from "~/utils/api";
import api from "~/utils/api";
import { f } from "~/utils/form";
import { Math2 } from "~/utils/math";

const { students } = useStudentData();
const names = studentNames(students);
const box = computed(() => {
    return f.combobox(names.value, {
        placeholder: "Choose a student...",
        compare: sortNames,
    });
});

const selected = ref<string | null>(null);
const loading = ref(false);
const data = ref<StudentHoursResponse | null>(null);

watch(selected, async (sid_hashed) => {
    loading.value = true;

    const end = (next: StudentHoursResponse | null = null) => {
        data.value = next;
        setTimeout(() => loading.value = false, 500); // prevent flashing the spinner
    };

    if (!sid_hashed) return end();

    const res = await api.student.hours({
        path: { id_hashed: sid_hashed },
    });

    if (!res.data) {
        api.error(res.error, res.response);
        return end();
    }

    end(res.data);
});
</script>

<template>
    <WidgetRoot class="widget" :required="['student_view']">
        <Combobox v-bind="box.props" v-model="selected" />

        <div v-if="loading" class="loading">
            <Spinner class="size-32" />
        </div>
        <div v-else-if="data" class="data">
            <span class="title">Build</span>
            <span class="value">{{ Math2.formatHours(data.build) }}</span>
            <span class="title">Learning</span>
            <span class="value">{{ Math2.formatHours(data.learning) }}</span>
            <span class="title">Outreach</span>
            <span class="value">{{ Math2.formatHours(data.demo) }}</span>
            <span class="title">Offseason</span>
            <span class="value">{{ Math2.formatHours(data.offseason) }}</span>
        </div>
        <HiddenText icon="hugeicons:view" v-else>
            Select a student to
            <br /> view their hours
        </HiddenText>
    </WidgetRoot>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.widget {
    @apply h-full p-4 justify-start;
}

.loading {
    @apply h-full flex justify-center items-center;
}

.data {
    @apply w-full h-full grid;
    @apply grid-cols-2 grid-rows-4 mt-2;

    row-gap: 1rem;
}

.title, .value {
    @apply flex justify-center items-center;
}

.title {
    @apply bg-white/9 w-full rounded-l-md;
}

.value {
    @apply bg-white/3 w-full rounded-r-md;
}
</style>
