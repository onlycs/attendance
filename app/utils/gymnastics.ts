// Type Gymnastics Utilities

export type { FilterArrayByValue as Filter, Narrow } from "@zodios/core/lib/utils.types";

import type { Narrow, RequiredKeys } from "@zodios/core/lib/utils.types";

type UnionToIntersection<U> = (
    U extends never ? never
        : (k: U) => void
) extends (k: infer I) => void ? I
    : never;

type LastOf<U> = UnionToIntersection<
    U extends never ? never : (x: U) => void
> extends (x: infer L) => void ? L
    : never;

type TuplifyUnion<T, L = LastOf<T>> = [T] extends [never] ? []
    : [...TuplifyUnion<Exclude<T, L>>, L];

type BuildTuple<
    N extends number,
    R extends unknown[] = []
> = R["length"] extends N ? R : BuildTuple<N, [...R, unknown]>;

export type Subtract<
    A extends number,
    B extends number
> = BuildTuple<A> extends [...infer U, ...BuildTuple<B>] ? U["length"] : never;

export type LessThan<
    N extends number,
    R extends unknown[] = []
> = R["length"] extends N ? never : R["length"] | LessThan<N, [...R, unknown]>;

export type FixedArray<
    T,
    N extends number,
    R extends T[] = []
> = R["length"] extends N ? R : FixedArray<T, N, [...R, T]>;

export type CountKeys<T> = TuplifyUnion<keyof T>["length"];

export type Optionalize<T, K extends keyof T> =
    & Omit<T, K>
    & Partial<Pick<T, K>>;

export type UndefinedIfOptional<T> = RequiredKeys<T> extends never ? undefined : T;

export type Prettify<T> = { [K in keyof T]: T[K]; } & {};
export type Merge<A, B> = Prettify<
    & Pick<A, keyof A>
    & Pick<B, Exclude<keyof B, keyof A>>
>;

/// Constrain T as much as possible using zodios voodoo magic
export function narrow<T>(a: Narrow<T>): Narrow<T> {
    return a;
}
