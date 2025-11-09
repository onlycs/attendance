import z from "zod";

export const ErrorSchema = z.object({
    type: z.enum([
        "Serde",
        "Sqlx",
        "Closed",
        "Time",
        "Data",
        "Unknown",
        "Send",
        "Auth",
    ]),
    source: z.string().optional(),
    location: z.string().optional(),
});

export const ErrorMessage = narrow({
    name: "Error",
    schema: z.object({
        message: z.string(),
        meta: ErrorSchema,
    }),
});
