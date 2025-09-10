<script setup lang="ts">
const body = inject<Ref<HTMLTableElement | null>>("table-body");
const container = ref<HTMLDivElement>();

function scroll(event: WheelEvent) {
	if (!container.value) return;
	event.preventDefault();

	// prevent momentum scrolling
	container.value.scrollTop += event.deltaY;
}
</script>

<template>
	<div class="body-container" ref="container" @wheel="scroll">
		<table ref="body" class="body-table">
			<tbody>
				<slot />
			</tbody>
		</table>
	</div>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.body-container {
	@apply relative w-fit;
	@apply overflow-y-scroll overscroll-none;
	scrollbar-width: none;
}

.body-table {
	@apply border-spacing-0 border-separate overflow-hidden;
	@apply border border-card-2 rounded-b-xl;
}
</style>

<style>
tbody tr:last-child td {
	@apply !border-b-0;
}
</style>