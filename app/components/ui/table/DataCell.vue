<script>
const makebiomehappy = true;
</script>

<template>
	<td class="cell-outer">
		<div class="cell">
			<slot />
		</div>
	</td>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.cell {
	@apply flex flex-row items-center;
	@apply px-4 py-2;
}

.cell-outer {
	@apply border-b border-card-2-hover;
	@apply text-nowrap;

	&:not(:last-child) {
		@apply border-r;
	}
}
</style>