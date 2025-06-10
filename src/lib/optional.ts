export type ValueOrProducer<T> = T | (() => T);

function isFunction<T>(value: ValueOrProducer<T>): value is () => T {
	return typeof value === "function";
}

function unpack<T>(value: ValueOrProducer<T>): T {
	return isFunction(value) ? value() : value;
}

abstract class OptionBase<T> {
	abstract isSome(): this is OptionSome<T>;
	abstract map<U>(mapper: (value: T) => U): Option<U>;
	abstract unwrap(or?: ValueOrProducer<T>): T;
	abstract match<U>(ok: (value: T) => U, err: () => U): U;

	static ofNullable<T>(value: T | null | undefined): Option<T> {
		if (value == null || value === undefined) return None;
		return Some(value);
	}
}

class OptionSome<T> extends OptionBase<T> {
	constructor(readonly value: T) {
		super();
	}

	isSome(): this is OptionSome<T> {
		return true;
	}

	map<U>(mapper: (value: T) => U): Option<U> {
		return new OptionSome(mapper(this.value));
	}

	unwrap(_?: ValueOrProducer<T>): T {
		return this.value;
	}

	match<U>(ok: (value: T) => U, _: () => U): U {
		return ok(this.value);
	}
}

class OptionNone<T> extends OptionBase<T> {
	isSome(): this is OptionSome<T> {
		return false;
	}

	map<U>(_: (value: T) => U): Option<U> {
		return new OptionNone();
	}

	unwrap(or?: ValueOrProducer<T> | undefined): T {
		if (or) return unpack(or);
		throw new Error("Attempted to unwrap a None value");
	}

	match<U>(_: (value: T) => U, err: () => U): U {
		return err();
	}
}

export type Option<T> = OptionSome<T> | OptionNone<T>;

// biome-ignore lint/suspicious/noExplicitAny: Any needs to be type-castable to any Option<T>
export const None = new OptionNone() as Option<any>;
export const Some = <T>(value: T) => new OptionSome(value) as Option<T>;

export const OptionOf = <T>(value: T | null | undefined): Option<T> =>
	OptionBase.ofNullable(value) as Option<T>;
