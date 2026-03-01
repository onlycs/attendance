<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { Line } from "vue-chartjs";
import api from "~/utils/api";

const { events } = useTelemetry({
    init: {
        query_type: "date_range",
        after: api.datetime.ser(
            Temporal.Now
                .plainDateISO()
                .subtract({ days: 5 })
                .toZonedDateTime({ timeZone: "UTC" }),
        ),
    },
    event: {
        event: "student_login",
        sid_hashed: [],
        admin_id: [],
    },
});

const counts = computed(() => {
    const sets = [
        new Set(),
        new Set(),
        new Set(),
        new Set(),
        new Set(),
    ];

    for (const event of events.value.values()) {
        if (event.event.event !== "student_login") continue;
        const date = api.datetime.parse(event.timestamp).toPlainDate();

        // now - event_date in days
        const days = Temporal.Now.plainDateISO().since(date).days;

        if (days >= 0 && days < 5) {
            sets[4 - days]!.add(event.event.sid_hashed);
        }
    }

    return sets.map(set => set.size);
});

const xLabels = computed(() =>
    counts.value.map((_, i) => {
        const date = Temporal.Now
            .plainDateISO()
            .subtract({ days: 4 - i })
            .toLocaleString("en-US", { month: "short", day: "numeric" });

        return date;
    })
);
</script>

<template>
    <WidgetRoot
        class="widget"
        :required="['hours_view', 'telemetry']"
    >
        <span class="title">Daily Logins</span>

        <Line
            :data="{
                labels: xLabels,
                datasets: [
                    {
                        label: 'Daily Logins',
                        data: counts,
                        fill: true,
                        borderColor: '#fff',
                        backgroundColor: '#fff',
                    },
                ],
            }"
            :options="{
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '10%',
                        ticks: {
                            precision: 0,
                        },
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        enabled: false,
                    },
                },
            }"
        ></Line>
    </WidgetRoot>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.widget {
    @apply p-4;
}

.title {
    @apply text-sm w-full mb-2;
}
</style>
