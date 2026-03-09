import type { NuxtApp } from "#app";
import { Temporal } from "temporal-polyfill";
import { toast } from "vue-sonner";
import client from "~/utils/api/client";
import { client as hclient } from "~/utils/api/hey/client.gen";

const parsedatetime = ornullish((datetime: string) => {
    const tz = Temporal.Now.timeZoneId();

    try {
        // Try parsing as ZonedDateTime first (has timezone info)
        return Temporal.ZonedDateTime.from(datetime);
    } catch {
        try {
            // Try parsing as Instant (ends with Z or has offset)
            const instant = Temporal.Instant.from(datetime);
            return instant.toZonedDateTimeISO(tz);
        } catch {
            // Fall back to PlainDateTime (no timezone info)
            const plain = Temporal.PlainDateTime.from(datetime);
            return plain.toZonedDateTime(tz);
        }
    }
});

const serdatetime = ornullish((d: Temporal.ZonedDateTime) => {
    return d.toInstant().toString();
});

const parseplaindate = ornullish((d: string) => {
    return Temporal.PlainDate.from(d);
});

const serplaindate = ornullish((d: Temporal.PlainDate) => {
    return d.toString();
});

export interface ApiToastOptions {
    handle401?: "redirect" | { message: string } | "api-message";
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
    const runtime = useRuntimeConfig();

    const url = [
        runtime.public.apiUrl,
        import.meta.dev ? "http://localhost:8080/" : "/api",
    ].find((u) => !!u)!;

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
