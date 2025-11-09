import { Temporal } from "temporal-polyfill";
import { zPlainDate } from "temporal-zod";
import z from "zod";
import { HourTypeSchema } from "~/utils/api";

export const SignIn = z.coerce
    .date()
    .transform((date) => Temporal.Instant.fromEpochMilliseconds(date.getTime()))
    .transform((instant) => instant.toZonedDateTimeISO("America/New_York"));

export const SignOut = z.preprocess(
    (val) => val ?? undefined,
    SignIn.optional(),
);

export const NaiveDate = zPlainDate;

export const EntrySchema = z.object({
    id: z.string(),
    kind: HourTypeSchema,
    start: SignIn,
    end: SignOut,
});

export const CellSchema = z.object({
    date: NaiveDate,
    entries: z.array(EntrySchema),
});

export type Entry = z.infer<typeof EntrySchema>;
export type Cell = z.infer<typeof CellSchema>;
