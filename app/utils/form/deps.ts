import type { Items } from "./item";
import type { ItemOutput } from "./output";

export type Deps<I extends Items> = {
    [K in keyof I]?: {
        [K2 in keyof I]?: ItemOutput<I[K2]> extends string
            ? string | string[]
            : never;
    };
};

export type DepValue<T> = T extends string[] ? T[number] : T;

export type DepMerge<
    I extends Items,
    D extends Deps<I>,
    KI extends keyof I,
    K2I extends keyof I,
    V extends string | string[],
> = D & {
    [K in KI]: D[K] & {
        [K2 in K2I]: V;
    };
};
