import type { ApiClient } from "~/plugins/api";

export type * from "./hey/types.gen";
export * from "./strings";

export default new Proxy(
    {},
    {
        get: (_, prop) => {
            const { $api } = useNuxtApp();
            return ($api as any)[prop];
        },
    },
) as ApiClient;
