<script setup lang="ts">
const time = ref<Date | undefined>(undefined);

watch(time, console.log);
</script>

<template>
	<TimePicker v-model:time="time" />
</template>