// Type Gymnastics Utilities

export type { FilterArrayByValue as Filter, Narrow } from "@zodios/core/lib/utils.types";

import type { IfAny } from "@vueuse/core";
import type { Narrow, RequiredKeys } from "@zodios/core/lib/utils.types";
import type { DeepReadonly, UnwrapNestedRefs, UnwrapRef } from "vue";

export type UnionToIntersection<U> = (U extends never ? never : (k: U) => void) extends (k: infer I) => void ? I
    : never;

export type LastOf<U> = UnionToIntersection<U extends never ? never : (x: U) => void> extends (x: infer L) => void ? L
    : never;

export type UnionToTuple<T, L = LastOf<T>> = [T] extends [never] ? [] : [...UnionToTuple<Exclude<T, L>>, L];

export type BuildTuple<N extends number, R extends unknown[] = []> = R["length"] extends N ? R
    : BuildTuple<N, [...R, unknown]>;

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

export type CountKeys<T> = UnionToTuple<keyof T>["length"];

export type Optionalize<T, K extends keyof T> =
    & Omit<T, K>
    & Partial<Pick<T, K>>;

export type UndefinedIfOptional<T> = RequiredKeys<T> extends never ? undefined : T;

export type Prettify<T> = { [K in keyof T]: T[K]; } & {};
export type Merge<A, B> = Prettify<
    & Pick<A, keyof A>
    & Pick<B, Exclude<keyof B, keyof A>>
>;

export type ValueIntersection<T> = {
    [K in keyof T]: (x: T[K]) => void;
} extends Record<keyof T, (x: infer I) => void> ? I : never;

export type KeyOf<T> = T extends never ? never : keyof T;
export type NullPassthrough<T, K> = T extends null | undefined ? T : K;

export type UnPartial<T> = {
    [K in keyof T]-?: NonNullable<T[K]>;
};

export type UnPromise<T> = T extends Promise<infer U> ? U : never;
export type NoneToNull<T> = T extends null | undefined ? null : T;
export type MaybeNone<T> = T | null | undefined;

/**
 * `as const` minus the `readonly`. works best with literals.
 * ```ts
 * const a = { x: 1, y: 2 };          // type: { x: number; y: number; }
 * const b = { x: 1, y: 2 } as const; // type: { readonly x: 1; readonly y: 2; }
 * const c = narrow({ x: 1, y: 2 });  // type: { x: 1; y: 2; }
 * ```
 *
 * @param a value to narrow
 * @returns the narrowed value
 */
export function narrow<T>(a: Narrow<T>): Narrow<T> {
    return a;
}

/**
 * Like `Object.assign`, but ignores undefined values in the source objects
 * ```ts
 * const a = { x: 1, y: 2 };
 * const b = { y: undefined, z: 3 };
 * safeassign(a, b); // { x: 1, y: 2, z: 3 }
 * Object.assign(a, b); // { x: 1, y: undefined, z: 3 }
 * ```
 *
 * @param a object to assign to
 * @param bs objects to assign from
 * @returns the merged object. `a` is also mutated.
 */
export function safeassign<T extends object>(a: T, ...bs: Partial<T>[]): T {
    const safeBs = bs.map(b => Object.fromEntries(Object.entries(b).filter(([_, v]) => v !== undefined)));
    return Object.assign({}, a, ...safeBs) as T;
}

export function watched<T>(getter: () => T, trigger: Ref<unknown>) {
    const r: [T] extends [Ref] ? IfAny<T, Ref<T>, T> : Ref<UnwrapRef<T>, UnwrapRef<T> | T> = ref<T>(getter());

    watch(trigger, () => {
        r.value = getter();
    });

    return readonly(r);
}

export function late<T>(): { value: T | null; } {
    return { value: null };
}
