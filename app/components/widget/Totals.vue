<script setup lang="ts">
import type { PresentResponse } from "~/utils/api";
import api from "~/utils/api";

const res = await api.roster.present.query();

if (!res.data) api.error(res.error, res.response);

const present = ref(res.data?.present.length ?? 0);
const absent = ref(res.data?.absent.length ?? 0);

function update(res: PresentResponse) {
    present.value = res.present.length;
    absent.value = res.absent.length;
}

useSSE().add(api.roster.present.stream, update);
</script>

<template>
    <WidgetRoot class="widget" :required="['student_view', 'hours_view']">
    </WidgetRoot>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.widget {
    @apply bg-drop rounded-lg;
}
</style>
