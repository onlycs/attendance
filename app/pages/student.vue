<script setup lang="ts">
import api, {
    HourTypeTitles,
    type HourType,
    type StudentHoursResponse,
} from "~/utils/api";
import { Math2 } from "~/utils/math";

const hours = ref<StudentHoursResponse | null>(null);
const { auth, user } = useAuth();
const router = useRouter();

const goals = {} as Record<HourType, number>;

for (const kind of Object.keys(HourTypeTitles) as HourType[]) {
    const res = await api.hour_type.goal({
        path: { kind },
    });

    if (res.data === undefined) {
        api.error(res.error, res.response);
        continue;
    }

    goals[kind] = res.data;
}

function makeHours(kind: HourType): [number, number, number] {
    return [
        hours.value![kind],
        Math.max(goals[kind] - hours.value![kind], 0),
        goals[kind],
    ];
}

onMounted(async () => {
    if (user.value.role !== "student") {
        auth.clear();
        return router.push("/");
    }

    const res = await api.student.hours({
        path: { id_hashed: sha256(user.value.id) },
    });

    if (!res.data) {
        return api.error(res.error, res.response);
    }

    hours.value = res.data;
});

function logout() {
    auth.clear();
    router.push("/");
}
</script>

<template>
    <div v-if="hours === null">
        <Icon
            name="svg-spinners:ring-resize"
            :customize="Customize.StrokeWidth(1)"
            mode="svg"
            size="256"
        />
    </div>
    <div v-else class="hours-table">
        <div class="header hidden" />

        <div class="header left">Earned</div>

        <div class="header">Remaining</div>

        <div class="header right">Goal</div>

        <div class="header top">Learning</div>

        <div class="data" v-for="time of makeHours('learning')">
            {{ Math2.formatHours(time) }}
        </div>

        <div class="header">Build</div>

        <div class="data build" v-for="time of makeHours('build')">
            {{ Math2.formatHours(time) }}
        </div>

        <div class="header">Outreach</div>

        <div class="data" v-for="time of makeHours('demo')">
            {{ Math2.formatHours(time) }}
        </div>

        <div class="header">Offseason</div>

        <div class="data" v-for="time of makeHours('offseason')">
            {{ Math2.formatHours(time) }}
        </div>

        <Button class="button" kind="danger" @click="logout">
            <Icon name="hugeicons:logout-02" mode="svg" size="48" />
        </Button>
    </div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.hours-table {
    @apply grid grid-cols-4 grid-rows-6 gap-1 p-2;

    .hidden {
        @apply invisible;
    }

    .data {
        @apply flex items-center justify-center;
        @apply bg-drop px-8 py-6;
        @apply md:text-xl;
    }

    .header {
        @apply flex items-center justify-center;
        @apply bg-card px-8 py-6;
        @apply text-lg select-none md:text-2xl;

        &.top {
            @apply rounded-tl-lg;
        }

        &.left {
            @apply rounded-tl-lg;
        }

        &.right {
            @apply rounded-tr-lg;
        }
    }

    .button {
        @apply col-span-4 h-fit!;
        @apply flex flex-row items-center justify-center gap-4;
        @apply rounded-t-sm! px-8 py-6 text-2xl;
    }

    div {
        @apply rounded-sm;
    }
}
</style>
