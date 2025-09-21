<script setup lang="ts">
defineProps<{
	kind:
		| "primary"
		| "background"
		| "card"
		| "card-2"
		| "error"
		| "error-transparent";
	disabled?: boolean;
}>();
</script>

<template>
	<button 
		:class="cn('button', $props.kind, $attrs.class as string | undefined, disabled && 'disabled')" 
		v-bind="$attrs" 
		:disabled="disabled"		
	>
		<slot />
	</button>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.button {
	@apply p-3 rounded-lg cursor-pointer;
	@apply active:scale-95;
	@apply transition-all duration-300;

	&.primary {
		@apply bg-white text-black;
		@apply active:bg-white/80 hover:bg-white/90;
	}

	&.card {
		@apply bg-card active:bg-card-active hover:bg-card-hover;
	}

	&.card-2 {
		@apply bg-card-2 active:bg-card-2-active hover:bg-card-2-hover;
	}

	&.background {
		@apply bg-background active:bg-background-dark hover:bg-card-active;
	}

	&.error {
		@apply bg-red-500 text-white;
		@apply active:bg-red-600 hover:bg-red-400;
	}

	&.error-transparent {
		@apply bg-red-500/10 text-red-500;
		@apply active:bg-red-500/20 hover:bg-red-500/30;
	}

	&.disabled {
		@apply opacity-50 cursor-not-allowed;
		@apply active:scale-100;
	}
}
</style>