<script setup lang="ts">
const router = useRouter();
const transition = injectTransition();

async function submit() {
	transition.out.trigger().then(() => router.push("/admin"));
}
</script>

<template>
	<div class="page">
		<FocusCard
			:animate="false"
			:showText="true"
			:customize="Customize.StrokeWidth(0.5)"
			icon="hugeicons:arrow-up-01"
			title="Back"
			class="back"
			@click="$router.push('/')"
		/>
		<div class="fullscreen">
			<div class="textbox">
				<Icon name="hugeicons:mortarboard-01" size="64" :customize="Customize.StrokeWidth(0.5)" mode="svg" />
				Student ID
			</div>
			<div />
			<FormPassword size="md" @submit="submit" />
			<div />
		</div>
	</div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.page {
	@apply w-full h-full p-4 gap-4;
	@apply flex flex-col;

	.back {
		@apply w-full;
	}

	.fullscreen {
		@apply w-full h-full bg-drop rounded-lg relative;
		@apply items-center justify-around flex flex-col;

		.textbox {
			@apply absolute flex items-center gap-6 top-8;
			@apply text-xl select-none;
		}
	}
}
</style>
