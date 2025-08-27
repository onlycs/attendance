import { Option } from "./option";

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
