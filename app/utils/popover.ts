export const usePopover = createGlobalState(() => {
	const popover = ref<Option<string>>(None);
	return popover;
});
