export function useSSE() {
    const { $sse } = useNuxtApp();
    return $sse;
}
