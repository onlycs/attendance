import { makeEndpoint } from "@zodios/core";
import { z } from "zod";
import { AuthorizationHeader } from "./auth";
import { ApiErrors } from "./error";

export const RosterActionSchema = z.enum(["login", "logout"]);

export const HourTypeSchema = z.enum([
    "build",
    "learning",
    "demo",
    "offseason",
]);

export const RosterRequestSchema = z.object({
    id: z.string(),
    kind: HourTypeSchema,
    force: z.boolean().optional(),
});

export const RosterResponseSchema = z.object({
    action: RosterActionSchema,
    denied: z.boolean(),
});

export type HourType = z.infer<typeof HourTypeSchema>;
export type RosterAction = z.infer<typeof RosterActionSchema>;
export type RosterRequest = z.infer<typeof RosterRequestSchema>;
export type RosterResponse = z.infer<typeof RosterResponseSchema>;

export const Roster = makeEndpoint({
    method: "post",
    path: "/roster",
    alias: "roster",
    parameters: [
        {
            name: "body",
            type: "Body",
            schema: RosterRequestSchema,
        },
        AuthorizationHeader,
    ],
    response: RosterResponseSchema,
    errors: ApiErrors,
});

export const RosterEndpoints = narrow([Roster]);
