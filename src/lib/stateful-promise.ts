import type { Result, ResultAsync } from "neverthrow";
import { useState } from "react";
import type { Option } from "./optional";
import { None, Some } from "./optional";

export interface StatefulPromiseInfo<T> {
	inProgress: boolean;
	current: Option<T>;
}

export function useStatefulPromise<T, E, A = void>(
	promise: (arg: A) => ResultAsync<T, E>,
	onError: (e: E) => void,
	onOk?: (o: T) => void,
) {
	const [state, setState] = useState<StatefulPromiseInfo<T>>({
		inProgress: false,
		current: None,
	});

	const execute = (arg: A) => {
		setState({ inProgress: true, current: None });
		return promise(arg).then((t) => {
			if (!t.isOk()) {
				setState({ inProgress: false, current: None });
				onError(t.error);
			} else {
				setState({ inProgress: false, current: Some(t.value) });
				onOk?.(t.value);
			}

			return t;
		}) as PromiseLike<Result<T, E>>;
	};

	return [state, execute] as const;
}
