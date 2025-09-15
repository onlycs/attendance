export class Accumulate {
	private total: number;

	constructor(initial: number = 0) {
		this.total = initial;
	}

	add(value: number): number {
		this.total += value;
		return value;
	}

	reset(value: number = 0): void {
		this.total = value;
	}

	get value(): number {
		return this.total;
	}
}
