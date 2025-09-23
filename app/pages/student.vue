<script setup lang="ts">
import { FocusCards } from "#components";

const transition = injectTransition();
const container = ref<InstanceType<typeof FocusCards>>();
const router = useRouter();
const params = useUrlSearchParams();

const show = transition.setup;
const animate = transition.ready;

onMounted(() => {
	transition.in.trigger({ reverse: params.reverse === "true" });
	delete params.reverse;
});

function hours() {
	transition.out.trigger().then(() => router.push("/hours"));
}

function logout() {
	useStudentId().value = null;
	transition.out.trigger({ reverse: true }).then(() => router.push("/"));
}
</script>

<template>
	<FocusCards :class="cn(!show && 'opacity-0')" :length="3" :animate="animate" ref="container">
		<FocusCard title="Check Hours" icon="hugeicons:user-time-01" @click="hours"  />
		<FocusCard title="Log Out" icon="hugeicons:logout-05" class="logout" @click="logout" />
	</FocusCards>
</template>

<style>
@reference "~/style/tailwind.css";

.logout * {
	@apply text-red-500;
}
</style>