export class LateInit<T> {
	private _value: T | null = null;

	get value(): T {
		if (this._value === null) {
			throw new Error("Value not initialized");
		}
		return this._value;
	}

	get hasValue(): boolean {
		return this._value !== null;
	}

	init(value: T): T {
		this._value = value;
		return this._value;
	}
}

export class Lazy<T> extends LateInit<T> {
	constructor(private factory: () => T) {
		super();
	}

	override get value(): T {
		if (!this.hasValue) this.init();
		return super.value;
	}

	override init(): T {
		return super.init(this.factory());
	}
}

export function memoize<T extends (...args: any[]) => any>(fn: T): T {
	const cache = new Map<string, ReturnType<T>>();

	return ((...args: Parameters<T>): ReturnType<T> => {
		const key = JSON.stringify(args);
		if (cache.has(key)) {
			return cache.get(key)!;
		}
		const result = fn(...args);
		cache.set(key, result);
		return result;
	}) as T;
}
