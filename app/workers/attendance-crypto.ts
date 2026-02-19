import * as attendance_crypto from "~/wasm/attendance_crypto";

let initialized = false;

export interface WorkerMessage<K extends keyof typeof attendance_crypto> {
    id: number;
    operation: K;
    args: (typeof attendance_crypto)[K] extends (...args: infer P) => any ? P : never;
}

self.onmessage = async (event: MessageEvent<WorkerMessage<keyof typeof attendance_crypto>>) => {
    if (!initialized) {
        await attendance_crypto.default();

        try {
            await attendance_crypto.initThreadPool(navigator.hardwareConcurrency || 4);
        } catch (e) {
            console.error("Failed to initialize thread pool:", e);
            console.warn("Assuming pool is already initialized");
        }

        initialized = true;
    }

    const { id, operation, args } = event.data;
    const func = attendance_crypto[operation] as (...args: any[]) => any;
    const fnargs = args as any[];
    const result = await (func as any)(...fnargs);

    self.postMessage({ id, result });
};
