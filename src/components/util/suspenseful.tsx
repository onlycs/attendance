/* eslint-disable @typescript-eslint/only-throw-error */

import { StatefulPromiseInfo } from '@lib/statefulpromise';
import { cn } from '@lib/utils';
import { Spinner } from '@ui/spinner';
import { Result } from 'neverthrow';
import { Suspense, SVGProps, type ReactNode } from 'react';

export interface SuspensefulProps<T, E> {
    Loading: () => ReactNode;
    Error: (props: { data: E }) => ReactNode;
    Ok: (props: { data: T }) => ReactNode;
    resource: Resource<T, E>;
}

export interface Resource<T, E> {
    get: () => Result<T, E>;
}

export function makeResource<T, E>(promise: Promise<Result<T, E>>): Resource<T, E> {
    let status: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    let result: Result<T, E> | undefined = undefined;
    const suspender = promise.then((res) => {
        status = 'fulfilled';
        result = res;
    });

    return {
        get: () => {
            if (status === 'pending') {
                throw suspender;
            } else return result!;
        },
    };
}

function SuspensefulInner<T, E>({ resource, Ok, Error }: SuspensefulProps<T, E>) {
    const result = resource.get();
    return result.match(ok => <Ok data={ok} />, err => <Error data={err} />);
}

export function Suspenseful<T, E>({ Ok, Loading, Error, resource }: SuspensefulProps<T, E>) {
    return (
        <Suspense fallback={<Loading />}>
            <SuspensefulInner resource={resource} Ok={Ok} Error={Error} Loading={Loading} />
        </Suspense>
    );
}

export interface MaybeLoadingProps extends SVGProps<SVGSVGElement> {
    state?: StatefulPromiseInfo<unknown>;
    className?: string;
}

export function MaybeLoading({ state, className, ...props }: MaybeLoadingProps) {
    if (state?.inProgress) return <Spinner className={className} {...props} />;
    else return (
        <div
            className={cn(
                props.width ? `w-[${props.width}]` : '',
                props.height ? `h-[${props.height}]` : '',
                className,
            )}
        />
    );
}
