export type ValueOrProducer<T> = T | (() => T);

function isFunction<T>(value: ValueOrProducer<T>): value is () => T {
    return typeof value === 'function';
}

function unpack<T>(value: ValueOrProducer<T>): T {
    return isFunction(value) ? value() : value;
}

export class Option<T> {
    protected constructor(protected value: T | null) {}

    static Some<T>(value: T): Option<T> {
        return new OptionSome<T>(value);
    }

    static None<T>(): Option<T> {
        return new OptionNone<T>();
    }

    static ofNullable<T>(value: T | null | undefined): Option<T> {
        return value ? Option.Some(value) : Option.None();
    }

    isSome(): this is OptionSome<T> {
        return this.value !== null;
    }

    unwrap(defaultValue?: ValueOrProducer<T>): T {
        if (!this.isSome()) {
            if (defaultValue) return unpack(defaultValue);
            throw new Error('Tried to unwrap a None value');
        }
        return this.value;
    }

    map<U>(fn: (value: T) => U): Option<U> {
        return this.isSome() ? Option.Some(fn(this.value)) : Option.None<U>();
    }

    match<K>(
        onSome: (value: T) => K,
        onNone: () => K,
    ): K {
        if (this.isSome()) return onSome(this.value);
        else return onNone();
    }
}

export class OptionSome<T> extends Option<T> {
    constructor(public value: T) {
        super(value);
    }
}

export class OptionNone<T> extends Option<T> {
    constructor() {
        super(null);
    }
}

export const None = Option.None.bind(Option);
export const Some = Option.Some.bind(Option);
