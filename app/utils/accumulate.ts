export class Accumulate {
	private total: number;
	private last: number;

	constructor(initial: number = 0) {
		this.total = initial;
		this.last = initial;
	}

	add_diff(value: number): number {
		this.last = this.total;
		this.total += value;
		return value;
	}

	reset(value: number = 0): void {
		this.total = value;
	}

	get value(): number {
		return this.total;
	}

	get prev(): number {
		return this.last;
	}
}
