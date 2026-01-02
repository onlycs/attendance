import type { WorkerMessage } from "~/workers/attendance-crypto";

type CryptoJs = typeof import("~/wasm/attendance_crypto");
type Awaited<R> = R extends Promise<infer T> ? T : R;

export class CryptoWorker {
    private worker: Worker;
    private pending: Map<number, { resolve: Function; reject: Function; }> = new Map();
    private id = 0;

    constructor() {
        this.worker = new Worker(new URL("~/workers/attendance-crypto.ts", import.meta.url), { type: "module" });

        this.worker.onmessage = (event: MessageEvent<{ id: number; result: any; }>) => {
            const { id, result } = event.data;
            const pending = this.pending.get(id);
            if (pending) {
                pending.resolve(result);
                this.pending.delete(id);
            }
        };
    }

    async execute<K extends keyof CryptoJs>(
        message: Omit<WorkerMessage<K>, "id">,
    ): Promise<CryptoJs[K] extends (...args: infer _P) => infer R ? Awaited<R> : never> {
        return new Promise((resolve, reject) => {
            this.pending.set(this.id, { resolve, reject });
            this.worker.postMessage({ id: this.id++, ...message });
        });
    }

    terminate() {
        this.worker.terminate();
        this.pending.clear();
    }
}

export default defineNuxtPlugin(async () => {
    const worker = new CryptoWorker();

    // dprint-ignore
    return {
        provide: {
            crypto: {
                worker, // this may gc itself- idfk how js works
                k1: {
                    encrypt: (ptxt: Uint8Array, psk: string) => worker.execute({ operation: "k1_encrypt", args: [ptxt, psk] }),
                    decrypt: (ctxt: string, psk: string) => worker.execute({ operation: "k1_decrypt", args: [ctxt, psk] }),
                },
                encrypt: (ptxt: string[], psk: Uint8Array) => worker.execute({ operation: "encrypt", args: [ptxt, psk] }),
                decrypt: (ctxt: string[], psk: Uint8Array) => worker.execute({ operation: "decrypt", args: [ctxt, psk] }),
                random_bytes: (len: number) => worker.execute({ operation: "random_bytes", args: [len] }),
            },
        },
    };
});
