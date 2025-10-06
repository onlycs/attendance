<script setup lang="tsx">
import { Temporal } from "temporal-polyfill";

const props = defineProps<{ time: Temporal.PlainTime | undefined }>();
const time = toRef(props, "time");
const emit = defineEmits<{ "update:time": [Temporal.PlainTime] }>();
const temporary = ref(
	time.value ? Temporal.PlainTime.from(time.value) : undefined,
);

watch(time, (t) => {
	temporary.value = t ? Temporal.PlainTime.from(t) : undefined;
});
</script>

<template>
	<TimePicker
	    :time="temporary"
		@submit="(t) => emit('update:time', t)"
	/>
</template>
