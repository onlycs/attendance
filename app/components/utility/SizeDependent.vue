<script setup lang="ts">
const mounted = ref(false);
const key = ref(false);

onMounted(() => {
	mounted.value = true;

	window.addEventListener("resize", () => {
		setTimeout(() => {
			key.value = !key.value; // trigger re-render on resize
		}, 50); // stuff was calculating screen size early, somehow
	});
});
</script>

<template>
	<div v-if="mounted" :key="+key">
		<slot />
	</div>
</template>