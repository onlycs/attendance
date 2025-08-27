<script setup lang="ts">
const head = inject<Ref<HTMLTableElement | null>>("table-head");
</script>

<template>
	<div class="header-container">
		<table class="header-table" ref="head">
			<thead class="header">
				<tr>
					<slot />
				</tr>
			</thead>
		</table>
	</div>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.header {
	@apply h-12;
}

.header-table {
	@apply border-spacing-0 border-separate overflow-hidden;
	@apply border border-card-2 rounded-t-xl;
}
</style>