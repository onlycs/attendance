export function useCrypto() {
    const { $crypto } = useNuxtApp();
    return $crypto;
}
