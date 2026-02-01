// Type Gymnastics Utilities

export type { FilterArrayByValue as Filter, Narrow } from "@zodios/core/lib/utils.types";

import type { MultiWatchSources } from "@vueuse/core";
import type { Narrow, OptionalProps, RequiredKeys } from "@zodios/core/lib/utils.types";
import type { DeepReadonly, WatchSource } from "vue";

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
export type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

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

export type UnPromise<T> = T extends Promise<infer U> ? U : T;
export type NoneToNull<T> = T extends null | undefined ? null : T;
export type MaybeNone<T> = T | null | undefined;
export type MaybePromise<T> = T | Promise<T>;

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
 * const a = { x: 1, y: 2, z: 3 };
 * const b = { y: undefined, z: null };
 * safeassign(a, b); // { x: 1, y: 2, z: null }
 * Object.assign({}, a, b); // { x: 1, y: undefined, z: null }
 * ```
 *
 * @param a object to assign to
 * @param bs objects to assign from
 * @returns the merged object. `a` is not modified.
 */
export function safeassign<T extends object>(a: T, ...bs: Partial<T>[]): T {
    const safeBs = bs.map(b => Object.fromEntries(Object.entries(b).filter(([_, v]) => v !== undefined)));
    return Object.assign({}, a, ...safeBs) as T;
}

/**
 * Like `Object.assign`, but ignores undefined values in the source objects
 * ```ts
 * const a = { x: 1, y: 2, z: 3 };
 * const b = { y: undefined, z: null };
 * safeassign(a, b); // { x: 1, y: 2, z: null }
 * Object.assign(a, b); // { x: 1, y: undefined, z: null }
 * ```
 *
 * @param a object to assign to
 * @param bs objects to assign from
 * @returns the merged object. `a` is modified.
 */
export function safemut<T extends object>(a: T, ...bs: Partial<T>[]): T {
    const safeBs = bs.map(b => Object.fromEntries(Object.entries(b).filter(([_, v]) => v !== undefined)));
    return Object.assign(a, ...safeBs) as T;
}

export function late<T>(): { value: T | null; } {
    return { value: null };
}

export function lazy<T>(factory: () => T): { get value(): T; } {
    return new class {
        private _value: T | null = null;

        get value(): T {
            if (this._value === null) {
                this._value = factory();
            }
            return this._value;
        }
    }();
}

export type WithUndefined<T extends object> = {
    [K in keyof T]: Exclude<T[K], null> | undefined;
};

export function null2undefined<O extends object>(a: O): WithUndefined<O>;
export function null2undefined<T>(a: T | undefined | null): T | undefined;

// peak typescript
export function null2undefined(a: any): any {
    if (a === null) return undefined;
    if (typeof a === "object") {
        const ret: any = {};
        for (const [k, v] of Object.entries(a)) {
            ret[k] = v === null ? undefined : v;
        }
        return ret;
    }
    return a;
}

/**
 * Wraps a function so that if the input is null or undefined, null is returned instead of calling the function.
 * @param f function to wrap
 * @returns a function that returns null if the input is null or undefined
 */
export function ornull<T, K>(f: (a: T) => K): (a: T | null | undefined) => K | null {
    return (a: T | null | undefined) => {
        if (a === null || a === undefined) return null;
        return f(a);
    };
}
