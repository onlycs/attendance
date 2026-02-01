import { createId } from "@paralleldrive/cuid2";
import _sha256 from "crypto-js/sha256";
import { Temporal } from "temporal-polyfill";
import type { Student } from "./api";
import { Option } from "./option";

// fucking javascript
export namespace Math2 {
    export function elapsed(t1: Date, t2: Date): number {
        if (t2 < t1) return elapsed(t2, t1);

        const diff = t2.getTime() - t1.getTime();
        return diff / 1000 / 60 / 60;
    }

    export function round(num: number, places: number): number {
        const factor = 10 ** places;
        return Math.round(num * factor) / factor;
    }

    export function clamp(num: number, min: number, max: number): number {
        return Math.min(Math.max(num, min), max);
    }

    export function bounded(num: number, min: number, max: number): boolean {
        return num >= min && num <= max;
    }

    export function format(num: number, unit: string, places = 0): string {
        return `${round(num, places)} ${round(num, places) === 1 ? unit : `${unit}s`}`.trim();
    }

    export function formatHours(hours: number): string {
        const mins = hours * 60;

        if (mins < 15) return format(mins, "Minute");
        else return format(hours, "Hour", 2);
    }

    export function formatDate(dt: Temporal.ZonedDateTime): string {
        const local = dt.withTimeZone(Temporal.Now.timeZoneId()).toPlainDateTime().toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });

        return local;
    }
}

export namespace Random {
    export function range(
        start: number,
        end: number,
        inclusive: boolean = false,
        rng = Math.random,
    ) {
        if (inclusive) return range(start, end + 1);
        const random = rng();

        return Math.floor(random * (end - start)) + start;
    }

    export function choose<T>(array: T[], rng?: () => number): Option<T>;
    export function choose<K extends string | number | symbol, V>(object: Record<K, V>, rng?: () => number): Option<V>;
    export function choose<T>(arrayOrObject: T[] | Record<any, T>, rng = Math.random): Option<T> {
        if (Array.isArray(arrayOrObject)) {
            if (arrayOrObject.length === 0) return None;
            const idx = range(0, arrayOrObject.length, false, rng);
            return Option.ofNullable(arrayOrObject[idx]);
        } else {
            const keys = Object.keys(arrayOrObject);
            if (keys.length === 0) return None;
            const idx = range(0, keys.length, false, rng);
            const key = keys[idx];
            return Option.ofNullable(arrayOrObject[key as keyof typeof arrayOrObject]);
        }
    }
}

export class hex {
    static from(number: bigint): string;
    static from(bytes: Uint8Array): string;
    static from(input: bigint | Uint8Array): string {
        if (typeof input === "bigint") {
            const s = input.toString(16);
            return s.length % 2 === 1 ? `0${s}` : s;
        } else {
            return Array.from(input)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
        }
    }

    static asint(hex: string): bigint {
        return BigInt(`0x${hex}`);
    }

    static asbytes(hex: string): Uint8Array {
        // note: we are already padded to even length
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }
}

export const sha256 = (a: string) => _sha256(a).toString();
export const cuid2 = () => createId();

export function sortNames(first1: string, first2: string, last1: string, last2: string): number;
export function sortNames(full1: string, full2: string): number;
export function sortNames(s1: Student, s2: Student): number;

export function sortNames(...args: FixedArray<string, 2> | FixedArray<string, 4> | FixedArray<Student, 2>): number {
    const isStudent = (arg: any): arg is FixedArray<Student, 2> => typeof arg[0] === "object";

    if (isStudent(args)) {
        return sortNames(args[0].first, args[1].first, args[0].last, args[1].last);
    }

    let f1, f2, l1, l2;

    if (args.length === 4) [f1, f2, l1, l2] = args;
    else {
        const [full1, full2] = args;
        [l1, ...f1] = full1!.split(" ").reverse();
        [l2, ...f2] = full2!.split(" ").reverse();
        f1 = f1.reverse().join(" ");
        f2 = f2.reverse().join(" ");
    }

    return l1!.localeCompare(l2!) || f1!.localeCompare(f2!);
}
