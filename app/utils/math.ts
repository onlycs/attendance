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
		return `${round(num, places)} ${num === 1 ? unit : `${unit}s`}`.trim();
	}

	export function formatHours(hours: number): string {
		const mins = hours * 60;

		if (mins < 15) return Math2.format(mins, "Minute");
		else return Math2.format(hours, "Hour", 2);
	}
}

export namespace Random {
	export function Range(
		start: number,
		end: number,
		inclusive: boolean = false,
		rng = Math.random,
	) {
		if (inclusive) return Range(start, end + 1);
		const random = rng();

		return Math.floor(random * (end - start)) + start;
	}

	export function RangeDecimal(start: number, end: number, rng = Math.random) {
		const random = rng();
		return random * (end - start) + start;
	}

	export function Choose<T>(array: T[], rng = Math.random): Option<T> {
		return Option.ofNullable(array[Range(0, array.length, false, rng)]);
	}
}
