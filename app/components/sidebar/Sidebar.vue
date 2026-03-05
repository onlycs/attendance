<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import type { HourType } from "~/utils/api";
import api from "~/utils/api";
import { Random } from "~/utils/math";

const month = Temporal.Now.plainDateISO().month;
const rarity = month > 4 ? 50 : 8 - month;

const allowedRes = await api.roster.allowed();
const allowed = allowedRes.data ?? [];

const modes: Readonly<Record<HourType, boolean>> = new Proxy({} as any, {
    get: (_, prop: HourType) => allowed.includes(prop),
});

const random = {
    common: [
        "heroicons:wrench-screwdriver",
        "hugeicons:computer-programming-01",
        "hugeicons:java",
        "hugeicons:automotive-battery-01",
        "hugeicons:robot-01",
        "lucide:pencil-ruler",
    ],
    rare: [
        "hugeicons:fire",
        "game-icons:corner-explosion",
        "game-icons:mine-explosion",
        "tabler:router-off",
    ],
};

const icons = {
    build: random.rare.concat(...Array(rarity).fill(random.common)),
    learning: [
        "hugeicons:mortarboard-01",
        "hugeicons:teaching",
        "hugeicons:students",
        "hugeicons:knowledge-01",
        "hugeicons:student",
    ],
};

const build = useState(() => Random.choose(icons.build).unwrap());
const learning = useState(() => Random.choose(icons.learning).unwrap());
const maybe = <T,>(mode: HourType, k: T) => (modes[mode] ? k : {});

const entries = computed(() => ({
    "/dashboard": {
        icon: "hugeicons:dashboard-square-02",
        name: "Dashboard",
    },
    "/editor": {
        icon: "hugeicons:pencil-edit-02",
        name: "Editor",
    },
    "/attendance": {
        icon: "hugeicons:clock-04",
        name: "Attendance",
        children: {
            ...maybe("build", {
                "/attendance/build": {
                    icon: build.value,
                    name: "Build Season",
                },
            }),
            ...maybe("learning", {
                "/attendance/learning": {
                    icon: learning.value,
                    name: "Learning Days",
                },
            }),
            ...maybe("demo", {
                "/attendance/demo": {
                    icon: "hugeicons:agreement-01",
                    name: "Outreach Hours",
                },
            }),
            ...maybe("offseason", {
                "/attendance/offseason": {
                    icon: build.value,
                    name: "Offseason",
                },
            }),
        },
    },
}));
</script>

<template>
    <div class="sidebar group/sidebar">
        <div class="header">
            <NuxtImg src="/favicon.png" class="icon" />
            <span class="text">Attendance</span>
        </div>

        <SidebarRoutes :routes="entries" :key="$route.fullPath" />

        <div class="footer">
            <SidebarRoutes
                :routes="{
                    '/settings': {
                        icon: 'hugeicons:settings-02',
                        name: 'Settings',
                    },
                    '/_logout': {
                        icon: 'hugeicons:logout-01',
                        name: 'Logout',
                        button: {
                            kind: 'danger',
                        },
                    },
                }"
            />
        </div>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.sidebar {
    display: grid;
    grid-template-rows: 1fr auto 1fr;

    @apply h-full w-16;
    @apply rounded-lg bg-drop p-2;

    &:hover {
        @apply w-78 p-6;
        @apply items-start;
    }
}

.header {
    @apply flex flex-row items-center gap-4 self-start;

    .icon {
        @apply h-12 w-12;
    }

    .text {
        @apply duration-[20ms];
        @apply text-2xl font-semibold whitespace-nowrap select-none;
        @apply w-0 opacity-0;

        @apply group-hover/sidebar:opacity-100;
        @apply group-hover/sidebar:translate-x-0;
        @apply group-hover/sidebar:duration-400;
    }
}

.footer {
    @apply self-end;
}
</style>

<style>
@reference "~/style/tailwind.css";

.sidebar *,
.sidebar {
    @apply transition-all duration-200;
}

.sidebar:hover *,
.sidebar:hover {
    @apply duration-300;
}
</style>
