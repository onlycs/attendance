// plugins/sse.ts
import { toast } from "vue-sonner";
import { cuid2 } from "~/utils/math";

export default defineNuxtPlugin(() => {
    let t: SSEThreadHandle | null = null;

    interface SSEThreadHandle {
        ab: AbortController;
        reconnection?: Promise<unknown>;
    }

    const OnDisconnects: [string, () => unknown][] = [
        [cuid2(), () => (t = { ab: new AbortController() })],
    ];

    function onDisconnect() {
        OnDisconnects.forEach(([_, f]) => f());
        if (OnDisconnects.length === 1) {
            toast.error(
                "Lost connection to the server. Please reload the page",
                { duration: Infinity },
            );
            return;
        }
    }

    async function inner<T>(
        ctor: () => Promise<{ stream: AsyncGenerator<T[]> }>,
        f: (data: T) => MaybePromise<unknown>,
    ) {
        if (!t) return;
        let tries = 0;
        while (true) {
            const begin = performance.now();
            const ab = t.ab;
            const { stream } = await ctor();
            for await (const item of stream) {
                try {
                    if (ab.signal.aborted) return;
                    await f(item as T);
                } catch (err) {
                    console.log(err);
                }
            }
            const end = performance.now();
            const dt = end - begin;
            if (tries > 5) {
                // maybe a race condition here? idk, better to check
                if (ab.signal.aborted) return;
                ab.abort();
                return onDisconnect();
            }

            // if we are the first to disconnect, our job to show the toast.
            if (t.reconnection === undefined) {
                const timeout = (tries + 1) * 5000;

                // we grant all simultaneously-disconnected threads a chill pill
                t.reconnection = sleep(timeout).then(
                    () => (t!.reconnection = undefined),
                );

                const timer = defineComponent({
                    setup() {
                        const countdown = ref(timeout / 1000);
                        const ctr = setInterval(
                            () => (countdown.value -= 1),
                            1000,
                        );
                        onUnmounted(() => clearInterval(ctr));
                        return () =>
                            h(
                                "span",
                                `Lost connection with the server. Trying again in ${countdown.value} seconds`,
                            );
                    },
                });

                toast.warning(timer, { duration: timeout });
            }
            // if t.reconnection is undefined, apparently js will just skip it
            await t.reconnection;
            // also, we get to set the next "tries"
            // if we've been connected awhile, reset.
            tries = dt < 5000 ? tries + 1 : 0;
        }
    }

    function add<T>(
        stream: () => Promise<{ stream: AsyncGenerator<T[]> }>,
        handler: (data: T) => MaybePromise<unknown>,
    ) {
        if (!t) {
            t = { ab: new AbortController() };
            const { $cleanup } = useNuxtApp();
            $cleanup.add(() => {
                t?.ab.abort();
                t = null;
            });
        }

        inner(stream, handler);
    }

    function addDisconnectListener(f: () => unknown) {
        const id = cuid2();
        OnDisconnects.push([id, f]);

        const { $cleanup } = useNuxtApp();
        $cleanup.add(() => removeDisconnectListener(id));
    }

    function removeDisconnectListener(id: string) {
        const i = OnDisconnects.findIndex(([id2, _]) => id2 === id);
        if (i === -1) return;
        OnDisconnects.splice(i, 1);
    }

    return {
        provide: {
            sse: {
                add,
                onDisconnect: addDisconnectListener,
            },
        },
    };
});
