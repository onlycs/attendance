<template>
	<th class="cell">
		<slot />
	</th>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.cell {
	@apply text-left px-4 bg-card;
	@apply font-medium text-lg text-nowrap;

	&:not(:last-child) {
		@apply border-r border-card-2-hover;
	}
}
</style>