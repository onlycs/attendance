<script setup lang="ts">
import type { PresentResponse } from "~/utils/api";
import api from "~/utils/api";

const res = await api.roster.present.query();

if (!res.data) {
    api.error(res.error, res.response, { handle: { [403]: () => {} } });
}

const present = ref(res.data?.present.length ?? 0);
const absent = ref(res.data?.absent.length ?? 0);

function update(res: PresentResponse) {
    present.value = res.present.length;
    absent.value = res.absent.length;
}

const percent = computed(() => {
    return (present.value * 100) / (present.value + absent.value);
});
const safepercent = computed(() => {
    if (percent.value < 22 || percent.value > 78) return 50;
    return percent.value;
});

useSSE().add(api.roster.present.stream, update);
</script>

<template>
    <WidgetRoot class="widget" :required="['student_view', 'hours_view']">
        <div class="box">
            <div class="data">
                <div class="present" :style="{ width: `${safepercent}%` }">
                    <span class="label">Present</span>
                    <NumberScroll :value="present" />
                </div>

                <div class="absent" :style="{ width: `${100 - safepercent}%` }">
                    <span class="label">Absent</span>
                    <NumberScroll :value="absent" />
                </div>
            </div>

            <div class="bar">
                <div class="present" :style="{ width: `${percent}%` }">
                    <div class="inner" />
                </div>
            </div>
        </div>
    </WidgetRoot>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.widget {
    @apply rounded-lg bg-drop;
    @apply min-h-37 min-w-[24rem];
}

.box {
    @apply h-full w-full p-4 pt-5;
    @apply flex flex-col gap-4;
}

.data {
    @apply flex flex-row;

    .present,
    .absent {
        @apply min-w-fit p-2;
        @apply flex flex-col items-center justify-center;

        @apply transition-all duration-150;
        transition-timing-function: linear;
    }

    .present {
        @apply border-r;
    }

    .label {
        @apply text-sm text-sub select-none;
    }
}

.bar {
    @apply h-6 w-full rounded-md bg-red-500/40;

    .present {
        @apply h-full rounded-md bg-drop;

        @apply transition-all duration-150;
        transition-timing-function: linear;

        .inner {
            @apply h-full w-full rounded-md bg-green-500/40;
        }
    }
}
</style>
