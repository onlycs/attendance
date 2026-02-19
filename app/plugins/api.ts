import type { NuxtApp } from "#app";
import { Temporal } from "temporal-polyfill";
import { toast } from "vue-sonner";
import client from "~/utils/api/client";
import { client as hclient } from "~/utils/api/hey/client.gen";

function parsedatetime<T extends string | null | undefined>(dt: T): NullPassthrough<T, Temporal.ZonedDateTime> {
    if (dt === null || dt === undefined) return dt as NullPassthrough<T, Temporal.ZonedDateTime>;
    const tz = Temporal.Now.timeZoneId();

    try {
        // Try parsing as ZonedDateTime first (has timezone info)
        return Temporal.ZonedDateTime.from(dt) as NullPassthrough<T, Temporal.ZonedDateTime>;
    } catch {
        try {
            // Try parsing as Instant (ends with Z or has offset)
            const instant = Temporal.Instant.from(dt);
            return instant.toZonedDateTimeISO(tz) as NullPassthrough<T, Temporal.ZonedDateTime>;
        } catch {
            // Fall back to PlainDateTime (no timezone info)
            const plain = Temporal.PlainDateTime.from(dt);
            return plain.toZonedDateTime(tz) as NullPassthrough<T, Temporal.ZonedDateTime>;
        }
    }
}

function serdatetime<T extends MaybeNone<Temporal.ZonedDateTime>>(dt: T): NullPassthrough<T, string> {
    if (dt === null || dt === undefined) return dt as NullPassthrough<T, string>;
    return dt.toInstant().toString() as NullPassthrough<T, string>;
}

function parseplaindate<T extends string | null>(d: T): NullPassthrough<T, Temporal.PlainDate> {
    if (d === null) return null as NullPassthrough<T, Temporal.PlainDate>;
    return Temporal.PlainDate.from(d) as NullPassthrough<T, Temporal.PlainDate>;
}

function serplaindate(d: Temporal.PlainDate): string {
    return d.toString();
}

export interface ApiToastOptions {
    handle401?: "redirect" | { message: string; } | "api-message";
    handle: Record<number, ((err: string) => void) | undefined>;
}

function error(
    err: string,
    res: Response,
    { handle401, handle }: Partial<ApiToastOptions> = {},
): void {
    if (!res || !("status" in res)) {
        toast.error("Couldn't reach the server. Are you offline?");
        return;
    }

    const code = res.status;
    if (handle && handle[code]) return handle[code](err);

    switch (code) {
        case 401: {
            if (typeof handle401 === "object") toast.error(handle401.message);
            else if (handle401 === "api-message") toast.error(err);
            else {
                const { auth } = useAuth();
                auth.clear();
                useRouter().push(redirect.build("/", "session-expired"));
            }

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

    if (err) toast.error(err);
    else toast.error("An unknown error occurred.");
}

export type ApiClient = NuxtApp["$api"];

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig();
    const url = config.public.apiUrl as string ?? "http://localhost:8080";

    hclient.setConfig({
        baseUrl: url,
        throwOnError: false,
        auth: () => {
            const { user } = useAuth();
            return user.value.role === "admin" ? user.value.jwt : undefined;
        },
    });

    return {
        provide: {
            api: {
                ...client,
                datetime: {
                    parse: parsedatetime,
                    ser: serdatetime,
                },
                plaindate: {
                    parse: parseplaindate,
                    ser: serplaindate,
                },
                error,
            },
        },
    };
});
