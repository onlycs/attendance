<script setup lang="ts">
import type { FocusCard } from "#components";
import { Random } from "~/utils/math";

const transition = injectTransition();
const params = useUrlSearchParams();
const router = useRouter();

const month = new Date().getMonth();
const isLearning = month >= 8; // gte sept cuz jan == 0

const show = transition.setup;
const animate = transition.ready;

const name = ["Learning Days", "Build Season"][+!isLearning]!;

const common = [
	"heroicons:wrench-screwdriver",
	"hugeicons:computer-programming-01",
	"hugeicons:java",
	"hugeicons:automotive-battery-01",
	"hugeicons:robot-01",
	"lucide:pencil-ruler",
];

// robotics be like
const rare = [
	"hugeicons:fire",
	"game-icons:corner-explosion",
	"game-icons:mine-explosion",
	"tabler:router-off",
];

const learning = [
	"hugeicons:motarboard-01",
	"hugeicons:teaching",
	"hugeicons:students",
	"hugeicons:knowledge-01",
	"hugeicons:student",
];

const rarity = month > 4 ? 50 : 8 - month;
const build = rare.concat(...Array(rarity).fill(common));

const icons = isLearning ? learning : build;
const icon = useState(() => Random.Choose(icons).unwrap());

function demo() {
	transition.out.trigger().then(() => router.push("/attendance/demo"));
}

function buildLearning() {
	const url = `/attendance/${isLearning ? "learning" : "build"}`;
	transition.out.trigger().then(() => router.push(url));
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

onMounted(() => {
	icon.value = Random.Choose(icons).unwrap();
});
</script>

<template>
	<FocusCards :class="cn(!show && 'opacity-0')" :animate="animate" ref="container">
		<FocusCard title="Back" icon="hugeicons:arrow-left-01" @click="back" />
		<FocusCard title="Volunteer Hours" icon="hugeicons:agreement-01" @click="demo" />
		<FocusCard :title="name" :icon="icon" @click="buildLearning" />
	</FocusCards>
</template>
