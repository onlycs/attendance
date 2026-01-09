export const onLoad = (f: () => unknown) => {
    const route = useRoute();

    watch(
        () => route.fullPath,
        () => setTimeout(f, 100),
        { immediate: true },
    );
};
