import type { WorkerMessage } from "~/workers/attendance-crypto";

type CryptoJs = typeof import("../../public/wasm/attendance_crypto");
type Awaited<R> = R extends Promise<infer T> ? T : R;

export class CryptoWorker {
    private worker: Worker;
    private pending: Map<number, { resolve: Function; reject: Function }> =
        new Map();
    private id = 0;

    constructor() {
        this.worker = new Worker(
            new URL("../workers/attendance-crypto.ts", import.meta.url),
            { type: "module" },
        );

        this.worker.onerror = (error) => {
            console.error("Worker error:", error);
        };

        this.worker.onmessageerror = (error) => {
            console.error("Worker message error:", error);
        };

        this.worker.onmessage = (
            event: MessageEvent<{ id: number; result: any }>,
        ) => {
            const { id, result } = event.data;
            const pending = this.pending.get(id);
            if (pending) {
                pending.resolve(result);
                this.pending.delete(id);
            }
        };

        this.pending.set(-1, {
            resolve: console.log,
            reject: () => {},
        });
        this.worker.postMessage("init");
    }

    async execute<K extends keyof CryptoJs>(
        message: Omit<WorkerMessage<K>, "id">,
    ): Promise<
        CryptoJs[K] extends (...args: infer _P) => infer R ? Awaited<R> : never
    > {
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

    // prettier-ignore
    return {
        provide: {
            crypto: {
                worker, // this may gc itself- idfk how js works
                k1: {
                    encrypt: (ptxt: Uint8Array, psk: string) => worker.execute({ operation: "k1_encrypt", args: [ptxt, psk] }),
                    decrypt: (ctxt: string, psk: string) => worker.execute({ operation: "k1_decrypt", args: [ctxt, psk] }),
                },
                invite: {
                    encryptk1: (k1: Uint8Array, k2: Uint8Array) => worker.execute({ operation: "k1_key_encrypt", args: [k1, k2] }),
                    decryptk1: (ctxt: string, k2: Uint8Array) => worker.execute({ operation: "k1_key_decrypt", args: [ctxt, k2] }),
                },
                encrypt: <T extends string[]>(ptxt: Narrow<T>, psk: Uint8Array): Promise<T | undefined> => worker.execute({ operation: "encrypt", args: [ptxt, psk] }) as any,
                decrypt: <T extends string[]>(ctxt: Narrow<T>, psk: Uint8Array): Promise<T | undefined> => worker.execute({ operation: "decrypt", args: [ctxt, psk] }) as any,
                random_bytes: (len: number) => worker.execute({ operation: "random_bytes", args: [len] }),
                totp: (secret: string) => worker.execute({ operation: "totp_generate", args: [secret] }),
            },
        },
    };
});
