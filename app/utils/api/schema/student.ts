import { makeEndpoint } from "@zodios/core";
import { z } from "zod";
import { ApiErrors } from "./error";
import { HourTypeSchema } from "./roster";

export const HoursResponseSchema = z.record(HourTypeSchema, z.number());
export const ExistsResponseSchema = z.boolean();

export type HoursResponse = z.infer<typeof HoursResponseSchema>;
export type ExistsResponse = z.infer<typeof ExistsResponseSchema>;

export const StudentHours = makeEndpoint({
	method: "get",
	path: "/student/:id/hours",
	alias: "student/hours",
	response: HoursResponseSchema,
	errors: ApiErrors,
});

export const StudentExists = makeEndpoint({
	method: "get",
	path: "/student/:id/exists",
	alias: "student/exists",
	response: ExistsResponseSchema,
	errors: ApiErrors,
});

export const StudentEndpoints = narrow([StudentHours, StudentExists]);
