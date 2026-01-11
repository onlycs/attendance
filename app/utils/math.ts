import _sha256 from "crypto-js/sha256";
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

    export function choose<T>(array: T[], rng = Math.random): Option<T> {
        return Option.ofNullable(array[range(0, array.length, false, rng)]);
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
