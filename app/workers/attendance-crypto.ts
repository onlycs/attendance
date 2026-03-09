type CryptoJs = typeof import("../../public/wasm/attendance_crypto");

// @ts-ignore
let attendance_crypto: CryptoJs;

let initialized = false;

export interface WorkerMessage<K extends keyof CryptoJs> {
    id: number;
    operation: K;
    args: CryptoJs[K] extends (...args: infer P) => any ? P : never;
}

self.onmessage = async (event: MessageEvent<WorkerMessage<keyof CryptoJs>>) => {
    if (!initialized) {
        attendance_crypto = await import(
            /* @vite-ignore */
            location.origin + "/wasm/attendance_crypto.js"
        );
        await attendance_crypto.default("/wasm/attendance_crypto_bg.wasm");

        try {
            await attendance_crypto.initThreadPool(
                navigator.hardwareConcurrency || 4,
            );
        } catch (e) {
            console.error("Failed to initialize thread pool:", e);
            console.warn("Assuming pool is already initialized");
        }

        initialized = true;
    }

    if (typeof event.data === "string" && event.data === "init") {
        self.postMessage({ id: -1, result: "Worker initialized" });
        return;
    }

    const { id, operation, args } = event.data;
    const func = attendance_crypto[operation] as (...args: any[]) => any;
    const result = await (func as any)(...(args as any[]));

    self.postMessage({ id, result });
};
