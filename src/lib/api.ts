import { makeApi, makeErrors, makeParameters, Zodios } from '@zodios/core';
import type { ErrorsToAxios } from '@zodios/core/lib/zodios.types';
import type { TypeOf } from 'zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ResultAsync } from 'neverthrow';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const ErrorSchema = makeErrors([{
    status: 'default',
    schema: z.string(),
}]);

const AuthSchema = makeParameters([{
    name: 'Authorization',
    type: 'Header',
    schema: z.string(),
}]);

const HoursSchema = z.object({
    learning: z.number(),
    build: z.number(),
});

const TokenSchema = z.object({
    token: z.string(),
});

const RouterSchema = z.object({
    id: z.string(),
    learning: z.number(),
    build: z.number(),
});

const CsvSchema = z.object({
    csv: z.string(),
});

export const ApiSchema = makeApi([
    {
        method: 'post',
        path: '/auth',
        alias: 'login',
        parameters: [{
            name: 'Login Request',
            type: 'Body',
            schema: z.object({
                password: z.string(),
            }),
        }],
        response: TokenSchema,
        errors: ErrorSchema,
    },
    {
        method: 'get',
        path: '/auth',
        alias: 'checkToken',
        parameters: [...AuthSchema],
        response: z.object({}),
        errors: ErrorSchema,
    },
    {
        method: 'get',
        path: '/hours',
        alias: 'userHours',
        parameters: [{
            name: 'User ID Request',
            type: 'Query',
            schema: z.object({
                id: z.string(),
            }),
        }],
        response: HoursSchema,
        errors: ErrorSchema,
    },
    {
        method: 'post',
        path: '/roster',
        alias: 'roster',
        parameters: [
            {
                name: 'rosterRequest',
                type: 'Body',
                schema: z.object({
                    id: z.string(),
                    force: z.boolean().default(false),
                }),
            },
            ...AuthSchema,
        ],
        response: RouterSchema,
        errors: ErrorSchema,
    },
    {
        method: 'get',
        path: '/hours.csv',
        alias: 'csv',
        parameters: AuthSchema,
        response: CsvSchema,
        errors: ErrorSchema,
    },
]);

export const ApiClient = new Zodios(API_URL, ApiSchema);
export const ErrorLinks: Record<number, string> = {
    [401]: '/login',
};

export type HoursResponse = TypeOf<typeof HoursSchema>;
export type LoginResponse = TypeOf<typeof TokenSchema>;
export type RouterResponse = TypeOf<typeof RouterSchema>;
export type CsvResponse = TypeOf<typeof CsvSchema>;

type AxiosError = ErrorsToAxios<typeof ErrorSchema>[number];
type Override<T, U> = Omit<T, keyof U> & U;

export type ApiError = Override<
    AxiosError,
    { response?: Override<AxiosError['response'], { status: number }> }
>;

export function apiResult<T>(promise: Promise<T>): ResultAsync<T, ApiError> {
    return ResultAsync.fromPromise(promise, e => e as ApiError);
}

export function apiToast(err: ApiError) {
    if (err.response?.status == 404) {
        toast.error('Route to API not found. This may be a bug.');
    } else if (!err.response?.data || err.response.data == '') {
        toast.error('Failed to connect to the server. Are you online?');
    } else {
        toast.error(err.response.data);
    }
}
