// I really, like really, don't like type gymnastics

import { Temporal } from "temporal-polyfill";
import { toast } from "vue-sonner";
import client from "./client";
import { client as hclient } from "./hey/client.gen";

declare global {
    const __API_URL__: string;
}

export const API_URL = __API_URL__;
export type * from "./hey/types.gen";

hclient.setConfig({
    baseUrl: API_URL,
    throwOnError: false,
});

function date(datetime: Date): Temporal.ZonedDateTime {
    const tz = Temporal.Now.timeZoneId();
    const dt = datetime.toISOString();

    try {
        // Try parsing as ZonedDateTime first (has timezone info)
        return Temporal.ZonedDateTime.from(dt);
    } catch {
        try {
            // Try parsing as Instant (ends with Z or has offset)
            const instant = Temporal.Instant.from(dt);
            return instant.toZonedDateTimeISO(tz);
        } catch {
            // Fall back to PlainDateTime (no timezone info)
            const plain = Temporal.PlainDateTime.from(dt);
            return plain.toZonedDateTime(tz);
        }
    }
}

export interface ApiToastOptions {
    handle401?: "redirect" | "none";
    handle: Record<number, (err: string) => void>;
}

function error(
    err: string,
    res: Response,
    { handle401, handle }: Partial<ApiToastOptions> = {},
) {
    if (!res || !("status" in res)) {
        return toast.error("Couldn't reach the server. Are you offline?");
    }

    const code = res.status;
    if (handle && handle[code]) return handle[code](err);

    switch (code) {
        case 401: {
            if (handle401 === "redirect") useRouter().push("/?throw=session-expired");
            else toast.error(err);
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

export default { ...client, date, error };
