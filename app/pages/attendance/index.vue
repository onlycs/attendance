<script setup lang="ts">
import type { FocusCard } from "#components";
import { identity } from "@vueuse/core";
import { Temporal } from "temporal-polyfill";
import type { HourType } from "~/utils/api";
import { Random } from "~/utils/math";

const transition = injectTransition();
const params = useUrlSearchParams();
const router = useRouter();

const month = Temporal.Now.plainDateISO().month;

const buildOk = month < 5;
const learningOk = month >= 11;
const offseasonOk = month >= 5;
const length = [buildOk, learningOk, offseasonOk].filter(identity).length;

const show = transition.setup;
const animate = transition.ready;

const buildCommon = [
    "heroicons:wrench-screwdriver",
    "hugeicons:computer-programming-01",
    "hugeicons:java",
    "hugeicons:automotive-battery-01",
    "hugeicons:robot-01",
    "lucide:pencil-ruler",
];

const buildRare = [
    "hugeicons:fire",
    "game-icons:corner-explosion",
    "game-icons:mine-explosion",
    "tabler:router-off",
];

const buildRarity = month > 4 ? 50 : 8 - month;
const buildIcons = buildRare.concat(...Array(buildRarity).fill(buildCommon));

const learningIcons = [
    "hugeicons:mortarboard-01",
    "hugeicons:teaching",
    "hugeicons:students",
    "hugeicons:knowledge-01",
    "hugeicons:student",
];

const buildIcon = useState(() => Random.Choose(buildIcons).unwrap());
const learningIcon = useState(() => Random.Choose(learningIcons).unwrap());

function transitionTo(type: HourType) {
    transition.out.trigger().then(() => router.push(`/attendance/${type}`));
}

function back() {
    transition.out
        .trigger({ reverse: true })
        .then(() => router.push("/admin?reverse=true"));
}

onMounted(() => {
    transition.in.trigger({ reverse: params.reverse === "true" });
    delete params.reverse;
});

definePageMeta({ layout: "admin-protected" });
</script>

<template>
    <FocusCards
        :class="cn(!show && 'opacity-0')"
        :animate="animate"
        :length="length + 2"
        ref="container"
        v-if="transition.setup"
    >
        <FocusCard title="Back" icon="hugeicons:arrow-left-01" @click="back" />
        <FocusCard
            title="Outreach Hours"
            icon="hugeicons:agreement-01"
            @click="() => transitionTo('demo')"
        />
        <FocusCard
            title="Build Season"
            :icon="buildIcon"
            v-if="buildOk"
            @click="() => transitionTo('build')"
        />
        <FocusCard
            title="Offseason"
            :icon="buildIcon"
            v-if="offseasonOk"
            @click="() => transitionTo('offseason')"
        />
        <FocusCard
            title="Learning Days"
            :icon="learningIcon"
            v-if="learningOk"
            @click="() => transitionTo('learning')"
        />
    </FocusCards>
</template>
