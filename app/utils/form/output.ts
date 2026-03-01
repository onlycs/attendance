import type z from "zod";
import type { Deps } from "./deps";
import type { ItemBase, Items, ItemTyZ } from "./item";

type DepValue<T> = T extends string[] ? T[number] : T;

export type ItemOutput<B extends ItemBase> = z.output<ItemTyZ<B>>;

// dprint-ignore
export type DepOutput<I extends Items, K extends keyof I, D extends Deps<I>> = K extends keyof D
    ? ItemOutput<I[K]> | undefined
    : ItemOutput<I[K]>;

export type IndependentOutputs<I extends Items, D extends Deps<I>> = {
    // use KeyOf rather than keyof because D[keyof D] may be never, and keyof never != never
    [K in Exclude<keyof I, KeyOf<D[keyof D]> | keyof D>]: ItemOutput<I[K]>;
};

export type DependentOutputs<I extends Items, K extends keyof I & keyof D, D extends Deps<I>> =
    | ({ [_K in K]: ItemOutput<I[K]>; } & { [K2 in keyof D[K]]: DepValue<D[K][K2]>; })
    | ({ [_K in K]?: never; } & ({ [K2 in keyof D[K] & keyof I]: Exclude<ItemOutput<I[K2]>, DepValue<D[K][K2]>>; }));

export type FormOutput<I extends Items, D extends Deps<I>> =
    & IndependentOutputs<I, D>
    & ValueIntersection<{ [K in keyof I & keyof D]: DependentOutputs<I, K, D>; }>;

export type FormRefs<I extends Items> = {
    [K in keyof I]: Ref<ItemOutput<I[K]> | null>;
};

export type FormOutputLoose<I extends Items> = {
    [K in keyof I]?: ItemOutput<I[K]>;
};
