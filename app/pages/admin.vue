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

function editor() {
	transition.out.trigger().then(() => router.push("/editor"));
}

function attendance() {
	transition.out.trigger().then(() => router.push("/attendance"));
}

function logout() {
	useToken().value = null;
	usePassword().value = null;
	transition.out.trigger({ reverse: true }).then(() => router.push("/"));
}

definePageMeta({ layout: "admin-protected" });
</script>

<template>
	<FocusCards :class="cn(!show && 'opacity-0')" :animate="animate" :length="3" ref="container">
		<FocusCard title="Hours Editor" icon="hugeicons:table" @click="editor"  />
		<FocusCard title="Attendance" icon="hugeicons:user-time-01" @click="attendance" />
		<FocusCard title="Log Out" icon="hugeicons:logout-05" class="logout" @click="logout" />
	</FocusCards>
</template>

<style>
@reference "~/style/tailwind.css";

.logout * {
	@apply text-red-500;
}
</style>