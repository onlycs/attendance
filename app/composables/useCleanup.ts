export function useCleanup() {
    const { $cleanup } = useNuxtApp();
    return $cleanup;
}
