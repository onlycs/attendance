// I really, like really, don't like type gymnastics

import createClient, { type FetchResponse } from "@onlycs/openapi-fetch";
import type { RequiredKeys } from "@zodios/core/lib/utils.types";
import { Err, Ok, Result, ResultAsync } from "neverthrow";
import { Temporal } from "temporal-polyfill";
import { toast } from "vue-sonner";
import type { Merge } from "../gymnastics";
import type { components, operations, paths } from "./schema";

declare global {
    const __API_URL__: string;
}

export const API_URL = __API_URL__;
export type * from "./schema";

const client = createClient<paths>({ baseUrl: API_URL });

type Method = "get" | "post" | "put" | "delete" | "patch";
type OperationOf<P> = P extends operations[keyof operations] ? P : never;

// dprint-ignore
type Body<O extends operations[keyof operations]["requestBody"]> =
    O extends { content: { "application/json": infer T } }
        ? T
        : undefined;

// not super feature-complete, but enough for right now.
type HttpBearer = {
    type: "http";
    scheme: "bearer";
};

export type SecurityParams = { header: { Authorization: string; }; };

// dprint-ignore
export type Params<
    R extends operations[keyof operations]["parameters"],
    S extends operations[keyof operations]["security"]
> = S extends Record<keyof S, HttpBearer>
    ? Merge<SecurityParams, R>
    : R;

// dprint-ignore
export type FetchOptions<R, B> = RequiredKeys<R> extends never
    ? [B] extends [undefined] ? [body?: B, params?: R] : [body: B, params?: R]
    : [B] extends [undefined] ? [params: R, body?: B] : [body: B, params: R];

export type PrimitiveResponse<O extends Record<string | number, any>, R, B> = FetchResponse<
    O,
    { params: R; body: B; },
    "application/json"
>;

export type ValidMethodsForPath<P extends keyof paths> = Method & RequiredKeys<paths[P]>;

async function apiPrimitive<
    P extends keyof paths,
    M extends ValidMethodsForPath<P>,
    O extends paths[P][M] & operations[keyof operations] = OperationOf<paths[P][M]>,
    S extends O["security"] = O["security"],
    R extends Params<O["parameters"], S> = Params<O["parameters"], S>,
    B extends Body<O["requestBody"]> = Body<O["requestBody"]>
>(
    path: P,
    method: M,
    ...options: FetchOptions<R, B>
): Promise<
    Result<
        Exclude<Response & PrimitiveResponse<O, R, B>["data"], undefined>,
        Exclude<Response & PrimitiveResponse<O, R, B>["error"], undefined>
    >
> {
    // reconstruct the needed json object
    let params: R = undefined as any;
    let body: B = undefined as any;

    if (!options[0]) {
        body = options[0] ?? {} as B;
        params = options[1] ?? {} as R;
    } else if (!options[1]) {
        // we can be fairly certain we are params-first if options[0] contains
        // only (but not all of) query/header/path/cookie.
        // although there is an edge case where the body itself only contains those keys,
        // there is no way to get that info at runtime, and it would be pretty bad API design
        const keys = Object.keys(options[0]!);
        const paramKeys = ["query", "header", "path", "cookie"];
        const paramsFirst = keys.every((k) => paramKeys.includes(k));

        if (paramsFirst) {
            params = options[0] as R;
            body = options[1] ?? {} as B;
        } else {
            body = options[0] as B;
            params = options[1] ?? {} as R;
        }
    } else {
        body = options[0] as B;
        params = options[1] as R;
    }

    const remainder = Object.keys(body!).length > 0 ? { body, params } : { params };
    const response: PrimitiveResponse<O, R, B> = await client.request(
        method,
        path as any,
        remainder,
    );

    if (response.error) return new Err({ ...response.response, ...response.error });
    else return new Ok({ ...response.response, ...response.data! });
}

export async function api<
    P extends keyof paths,
    M extends ValidMethodsForPath<P>,
    O extends paths[P][M] & operations[keyof operations] = OperationOf<paths[P][M]>,
    S extends O["security"] = O["security"],
    R extends Params<O["parameters"], S> = Params<O["parameters"], S>,
    B extends Body<O["requestBody"]> = Body<O["requestBody"]>
>(
    path: P,
    method: M,
    ...options: FetchOptions<R, B>
): Promise<
    Result<
        Exclude<Response & PrimitiveResponse<O, R, B>["data"], undefined>,
        Exclude<Response & PrimitiveResponse<O, R, B>["error"], undefined> | { "text/plain": string; }
    >
> {
    const response = apiPrimitive<P, M, O, S, R, B>(path, method, ...options);

    return await response.catch((e) => {
        return new Err({
            "text/plain": "Could not connect to the server. Are you online?",
        });
    });
}

export function apiDateTime(datetimestr: string): Temporal.ZonedDateTime {
    const tz = Temporal.Now.timeZoneId();

    try {
        // Try parsing as ZonedDateTime first (has timezone info)
        return Temporal.ZonedDateTime.from(datetimestr);
    } catch {
        try {
            // Try parsing as Instant (ends with Z or has offset)
            const instant = Temporal.Instant.from(datetimestr);
            return instant.toZonedDateTimeISO(tz);
        } catch {
            // Fall back to PlainDateTime (no timezone info)
            const plain = Temporal.PlainDateTime.from(datetimestr);
            return plain.toZonedDateTime(tz);
        }
    }
}

export type ApiError = (Response & { "text/plain": string; }) | { "text/plain": string; };

export interface ApiToastOptions {
    redirect401: (url: string) => void;
    handle: Record<number, (err: ApiError) => void>;
}

export function apiToast(
    err: ApiError,
    { redirect401, handle }: Partial<ApiToastOptions> = {},
) {
    if (!("status" in err)) {
        return toast.error(err["text/plain"]);
    }

    const code = err.status as number;
    if (handle && handle[code]) return handle[code](err);

    switch (code) {
        case 401: {
            if (redirect401) redirect401("/?error=session-expired");
            else toast.error("You are not authorized. Please log in again.");
            return;
        }
        case 404: {
            toast.error("Could not find some data. This is probably a bug.");
            return;
        }
        case 500: {
            toast.error("There was a problem with the server. This is a bug");
            return;
        }
    }

    if (err["text/plain"]) toast.error(err["text/plain"]);
    else toast.error("An unknown error occurred.");
}
