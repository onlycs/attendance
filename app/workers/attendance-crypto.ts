import * as crypto from "~/wasm/attendance_crypto";

let initialized = false;

export interface WorkerMessage<K extends keyof typeof crypto> {
    id: number;
    operation: K;
    args: (typeof crypto)[K] extends (...args: infer P) => any ? P : never;
}

self.onmessage = async (event: MessageEvent<WorkerMessage<keyof typeof crypto>>) => {
    if (!initialized) {
        await crypto.default();
        await crypto.initThreadPool(navigator.hardwareConcurrency || 4);
        initialized = true;
    }

    const { id, operation, args } = event.data;
    const func = crypto[operation] as (...args: any[]) => any;
    const fnargs = args as any[];
    const result = await (func as any)(...fnargs);

    self.postMessage({ id, result });
};
