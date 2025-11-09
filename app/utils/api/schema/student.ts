import { makeEndpoint } from "@zodios/core";
import { z } from "zod";
import { ApiErrors } from "./error";
import { HourTypeSchema } from "./roster";

export const StudentDataSchema = z.object({
    id: z.string(),
    first: z.string(),
    last: z.string(),
    hashed: z.string(),
});
export const HoursResponseSchema = z.record(HourTypeSchema, z.number());
export const ExistsResponseSchema = z.boolean();

export type StudentData = z.infer<typeof StudentDataSchema>;
export type HoursResponse = z.infer<typeof HoursResponseSchema>;
export type ExistsResponse = z.infer<typeof ExistsResponseSchema>;

export const StudentInfo = makeEndpoint({
    method: "get",
    path: "/student/:id",
    alias: "student/info",
    response: HoursResponseSchema,
    errors: ApiErrors,
});

export const StudentAdd = makeEndpoint({
    method: "post",
    path: "/student/add",
    alias: "student/add",
    parameters: [
        {
            name: "body",
            type: "Body",
            schema: StudentDataSchema,
        },
    ],
    response: z.void(),
    errors: ApiErrors,
});

export const StudentEndpoints = narrow([StudentInfo, StudentAdd]);
