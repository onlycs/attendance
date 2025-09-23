<script setup lang="ts">
import { Toaster } from "vue-sonner";
import type { TransitionControls, TransitionOptions } from "~/utils/transition";

const content = ref<HTMLElement>();
const mobile = useMobile();
const params = useUrlSearchParams();

const outStarted = ref<boolean>(false);
const outComplete = ref<boolean>(false);

const inStarted = ref<boolean>(false);
const inComplete = ref<boolean>(false);

function transitionOut({
	reverse,
	timing,
}: TransitionOptions = {}): Promise<void> {
	reverse ??= false;
	timing ??= { ...Timing.slow, offset: Timing.offset };

	const { $gsap } = useNuxtApp();
	const tl = $gsap.timeline();
	const isMobile = mobile.value;

	if (!content.value) return new Promise((res, _) => res());

	// walk the children of #content, check for the root-most elements that have
	// a background color set
	const elements = [];
	const queue = [content.value];

	while (queue.length > 0) {
		const next = queue.pop();

		for (const child of Array.from(next?.children ?? []) as HTMLElement[]) {
			const style = getComputedStyle(child);
			const isSolid =
				style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
				style.backgroundColor !== "transparent";

			const forceInclude = child.classList.contains("page-transition");
			const forceExclude = child.classList.contains("no-page-transition");

			if ((isSolid || forceInclude) && !forceExclude) {
				// extra checks
				const bbox = child.getBoundingClientRect();

				if (
					bbox.top >= window.innerHeight ||
					bbox.bottom <= 0 ||
					bbox.left >= window.innerWidth ||
					bbox.right <= 0
				) {
					// out of view
					continue;
				}

				if (style.opacity === "0") {
					// invisible
					continue;
				}

				elements.push(child);
			} else {
				queue.push(child);
			}
		}
	}

	// sort the elements by left-to-right, top-to-bottom positioning
	elements.sort((a, b) => {
		const aBox = a.getBoundingClientRect();
		const bBox = b.getBoundingClientRect();

		// compare their centers rather than their top-left corners
		const aCenterX = aBox.left + aBox.width / 2;
		const aCenterY = aBox.top + aBox.height / 2;
		const bCenterX = bBox.left + bBox.width / 2;
		const bCenterY = bBox.top + bBox.height / 2;

		if (isMobile) {
			if (aCenterY === bCenterY) {
				return aCenterX - bCenterX;
			}

			return aCenterY - bCenterY;
		}

		if (aCenterX === bCenterX) {
			return aCenterY - bCenterY;
		}

		return aCenterX - bCenterX;
	});

	if (reverse) elements.reverse();

	outStarted.value = true;

	let i = 0;
	for (const el of elements) {
		tl.to(
			el,
			{
				opacity: 0,
				y: !isMobile ? `${reverse ? "" : "-"}100vh` : undefined,
				x: isMobile ? `${reverse ? "" : "-"}100vw` : undefined,
				...timing.out,
			},
			i * timing.offset,
		);
		i++;
	}

	return new Promise((res, _) => {
		tl.call(() => {
			outComplete.value = true;
			res();
		});
	});
}

async function transitionIn({
	reverse,
	timing,
}: TransitionOptions = {}): Promise<void> {
	reverse ??= false;
	timing ??= { ...Timing.slow, offset: Timing.offset };

	outComplete.value = false;
	outStarted.value = false;
	inComplete.value = false;
	inStarted.value = false;

	const { $gsap } = useNuxtApp();
	const tl = $gsap.timeline();
	const isMobile = mobile.value;

	if (!content.value) return new Promise((res, _) => res());

	// walk the children of #content, check for the root-most elements that have
	// a background color set
	const elements: HTMLElement[] = [];
	const queue = [content.value];

	while (queue.length > 0) {
		const next = queue.pop();

		for (const child of Array.from(next?.children ?? []) as HTMLElement[]) {
			const style = getComputedStyle(child);
			const isSolid =
				style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
				style.backgroundColor !== "transparent";

			const forceInclude = child.classList.contains("page-transition");
			const forceExclude = child.classList.contains("no-page-transition");

			if ((isSolid || forceInclude) && !forceExclude) {
				// extra checks
				const bbox = child.getBoundingClientRect();

				if (
					bbox.top >= window.innerHeight ||
					bbox.bottom <= 0 ||
					bbox.left >= window.innerWidth ||
					bbox.right <= 0
				) {
					// out of view
					continue;
				}

				if (style.opacity === "0") {
					// invisible
					continue;
				}

				elements.push(child);
			} else {
				queue.push(child);
			}
		}
	}

	// sort the elements by left-to-right, top-to-bottom positioning
	elements.sort((a, b) => {
		const aBox = a.getBoundingClientRect();
		const bBox = b.getBoundingClientRect();

		// compare their centers rather than their top-left corners
		const aCenterX = aBox.left + aBox.width / 2;
		const aCenterY = aBox.top + aBox.height / 2;
		const bCenterX = bBox.left + bBox.width / 2;
		const bCenterY = bBox.top + bBox.height / 2;

		if (isMobile) {
			if (aCenterY === bCenterY) {
				return aCenterX - bCenterX;
			}

			return aCenterY - bCenterY;
		}

		if (aCenterX === bCenterX) {
			return aCenterY - bCenterY;
		}

		return aCenterX - bCenterX;
	});

	if (reverse) elements.reverse();

	for (const el of elements) {
		tl.set(
			el,
			{
				opacity: 0,
				y: !isMobile ? `${reverse ? "-" : ""}100vh` : undefined,
				x: isMobile ? `${reverse ? "-" : ""}100vw` : undefined,
			},
			0,
		);
	}

	// give gsap a chance to apply the initial styles
	setTimeout(() => {
		inStarted.value = true;
	}, 20);

	let i = 0;
	for (const el of elements) {
		tl.to(
			el,
			{
				y: 0,
				x: 0,
				opacity: 1,
				clearProps: "all",
				...timing.in,
			},
			i * timing.offset,
		);
		i++;
	}

	return new Promise((res, _) => {
		tl.call(() => {
			inComplete.value = true;
			res();
		});
	});
}

const controls: TransitionControls = {
	in: {
		begun: inStarted,
		complete: inComplete,
		trigger: transitionIn,
	},
	out: {
		begun: outStarted,
		complete: outComplete,
		trigger: transitionOut,
	},
};

provideTransition(controls);
defineExpose({ transition: controls });
</script>

<template>
    <div id="content" ref="content" data-vaul-drawer-wrapper>
        <slot />
    </div>
    <Footer />
	<Toaster rich-colors theme="dark" position="top-right" />
</template>

<style scoped>
@reference "~/style/tailwind.css";

#content {
	@apply flex-1;
    @apply flex flex-col justify-center items-center;
    @apply bg-background;
	@apply w-full;
}
</style>
