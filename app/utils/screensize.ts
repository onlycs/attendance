export function useScreenSize() {
	const md = window?.matchMedia("(min-width: 770px)");
	const lg = window?.matchMedia("(min-width: 1030px)");
	const xl = window?.matchMedia("(min-width: 1280px)");
	const xxl = window?.matchMedia("(min-width: 1535px)");
	const screenSize = ref(4);

	function update() {
		if (xxl?.matches) screenSize.value = 4;
		else if (xl?.matches) screenSize.value = 3;
		else if (lg?.matches) screenSize.value = 2;
		else if (md?.matches) screenSize.value = 1;
		else screenSize.value = 0;
	}

	onMounted(() => {
		update();
		md?.addEventListener("change", update);
		lg?.addEventListener("change", update);
		xl?.addEventListener("change", update);
		xxl?.addEventListener("change", update);
	});

	onUnmounted(() => {
		md?.removeEventListener("change", update);
		lg?.removeEventListener("change", update);
		xl?.removeEventListener("change", update);
		xxl?.removeEventListener("change", update);
	});

	return screenSize;
}

export function useMobile(screenSize?: Ref<number>) {
	screenSize = screenSize ?? useScreenSize();
	return computed(() => screenSize.value === 0);
}
