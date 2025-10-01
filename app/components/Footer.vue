<template>
	<div class="footer">
		<div class="section self-start">
			<p class="message">Made with</p>
			<Icon name="hugeicons:favourite" class="text-red-500" size="16" />
			<p class="message">by</p>
			<FancyLink href="https://github.com/onlycs" class="message">
				Angad
			</FancyLink>
			<p class="message overflowing">for</p>
			<FancyLink
				href="https://thebluealliance.com/team/2791"
				class="message overflowing"
			>
				Team 2791
			</FancyLink>
		</div>

		<div class="section self-end">
			<FancyLink
				href="https://github.com/onlycs/attendance"
				class="linkbox"
				dashless
				lineless
			>
				<Icon class="icon" name="hugeicons:github" />
			</FancyLink>

			<FancyLink
				href="https://thebluealliance.com/team/2791"
				class="linkbox"
				dashless
				lineless
			>
				<NuxtImg class="icon" src="/tba-white.svg" />
			</FancyLink>
		</div>
	</div>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.footer {
	@apply bottom-0 right-0 w-screen shrink-0;
	@apply max-md:h-8 h-10;
	@apply flex flex-row items-center px-4 justify-between;
	@apply bg-drop;
	@apply z-50;
}

.section {
	@apply flex flex-row items-center;
	@apply max-md:gap-2 gap-3;
	@apply h-full;
}

.message {
	@apply max-md:text-sm;
}

.overflowing {
	@apply max-md:hidden;
}

.linkbox {
	@apply w-[18px] h-[18px];
	@apply text-white;

	.icon {
		@apply w-[18px] h-[18px];
	}
}

* {
	@apply select-none;
}
</style>
