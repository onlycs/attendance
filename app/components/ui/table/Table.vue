<script setup lang="ts">
const head = ref<HTMLTableElement | null>(null);
const body = ref<HTMLTableElement | null>(null);

provide("table-head", head);
provide("table-body", body);

watchEffect(() => {
	if (!head.value || !body.value) return;

	const headCells = head.value.querySelectorAll("th");
	const bodyRows = body.value.querySelector("tr")?.querySelectorAll("td");

	if (!bodyRows) return;
	if (headCells.length !== bodyRows.length) return;
	if (headCells.length === 0) return;

	for (const [i, headCell] of headCells.entries()) {
		const bodyCell = bodyRows[i] as HTMLTableCellElement;
		const headBox = headCell.getBoundingClientRect();
		const bodyBox = bodyCell.getBoundingClientRect();

		const width = Math.max(headBox.width, bodyBox.width);

		headCell.style.minWidth = `${width}px`;
		bodyCell.style.minWidth = `${width}px`;
	}
});
</script>

<template>
	<div class="table-container">
		<slot />
	</div>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.table-container {
	@apply flex flex-col;
}
</style>