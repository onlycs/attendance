/* eslint-disable @typescript-eslint/only-throw-error */

import type { StatefulPromiseInfo } from "@lib/stateful-promise";
import { Spinner } from "@ui/spinner";
import type { Result } from "neverthrow";
import { type ReactNode, type SVGProps, Suspense } from "react";

export interface SuspensefulProps<T, E> {
	Loading: () => ReactNode;
	Err: (props: { data: E }) => ReactNode;
	Ok: (props: { data: T }) => ReactNode;
	resource: Resource<T, E>;
}

export interface Resource<T, E> {
	get: () => Result<T, E>;
}

export function makeResource<T, E>(
	promise: Promise<Result<T, E>>,
): Resource<T, E> {
	let status: "pending" | "fulfilled" | "rejected" = "pending";
	let result: Result<T, E> | undefined = undefined;
	const suspender = promise.then((res) => {
		status = "fulfilled";
		result = res;
	});

	return {
		get: () => {
			if (status === "pending" || result === undefined) {
				throw suspender;
			}

			return result;
		},
	};
}

function SuspensefulInner<T, E>({ resource, Ok, Err }: SuspensefulProps<T, E>) {
	const result = resource.get();
	return result.match(
		(ok) => <Ok data={ok} />,
		(err) => <Err data={err} />,
	);
}

export function Suspenseful<T, E>({
	Ok,
	Loading,
	Err,
	resource,
}: SuspensefulProps<T, E>) {
	return (
		<Suspense fallback={<Loading />}>
			<SuspensefulInner
				resource={resource}
				Ok={Ok}
				Err={Err}
				Loading={Loading}
			/>
		</Suspense>
	);
}

export interface MaybeLoadingProps extends SVGProps<SVGSVGElement> {
	state?: StatefulPromiseInfo<unknown>;
	className?: string;
}

export function MaybeLoading({
	state,
	className,
	...props
}: MaybeLoadingProps) {
	if (state?.inProgress) return <Spinner className={className} {...props} />;

	return (
		<div
			className={className}
			style={{
				width: props.width,
				height: props.height,
				opacity: 0,
				zIndex: -999,
			}}
		/>
	);
}
