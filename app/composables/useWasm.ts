export function useCrypto() {
    const { $crypto } = useNuxtApp();
    return $crypto;
}

export type WasmCrypto = ReturnType<typeof useCrypto>;
