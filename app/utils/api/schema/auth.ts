import { makeEndpoint } from "@zodios/core";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { ApiErrors } from "./error";

export const RegisterStartRequestSchema = z.object({
	s: z.string(),
	v: z.string(),
});

export const RegisterFinishSchema = z.object({
	data: z.string(),
});

export const LoginStartResponseSchema = z.object({
	salt: z.string(),
	b: z.string(),
});

export const LoginFinishRequestSchema = z.object({
	a: z.string(),
	m1: z.string(),
});

export const LoginFinishResponseSchema = z.object({
	m2: z.string(),
	token: z.string(),
	expires: z
		.string()
		.transform((str) => Temporal.ZonedDateTime.from(`${str}[UTC]`)),
});

export const ValidResponseSchema = z.boolean();

export type RegisterStartRequest = z.infer<typeof RegisterStartRequestSchema>;
export type EncryptedData = z.infer<typeof RegisterFinishSchema>;
export type LoginStartResponse = z.infer<typeof LoginStartResponseSchema>;
export type LoginFinishRequest = z.infer<typeof LoginFinishRequestSchema>;
export type LoginFinishResponse = z.infer<typeof LoginFinishResponseSchema>;
export type ValidResponse = z.infer<typeof ValidResponseSchema>;

export const AuthorizationHeader = narrow({
	name: "Authorization",
	type: "Header",
	schema: z.string(),
});

export const RegisterStart = makeEndpoint({
	method: "post",
	path: "/auth/register/start",
	alias: "register/start",
	response: RegisterFinishSchema,
	parameters: [
		AuthorizationHeader,
		{
			name: "body",
			type: "Body",
			schema: RegisterStartRequestSchema,
		},
	],
	errors: ApiErrors,
});

export const RegisterFinish = makeEndpoint({
	method: "post",
	path: "/auth/register/finish",
	alias: "register/finish",
	parameters: [
		AuthorizationHeader,
		{
			name: "body",
			type: "Body",
			schema: RegisterFinishSchema,
		},
	],
	response: z.object({ status: z.literal("ok") }),
	errors: ApiErrors,
});

export const LoginStart = makeEndpoint({
	method: "post",
	path: "/auth/login/start",
	alias: "login/start",
	response: LoginStartResponseSchema,
	errors: ApiErrors,
});

export const LoginFinish = makeEndpoint({
	method: "post",
	path: "/auth/login/finish",
	alias: "login/finish",
	parameters: [
		{
			name: "body",
			type: "Body",
			schema: LoginFinishRequestSchema,
		},
	],
	response: LoginFinishResponseSchema,
	errors: ApiErrors,
});

export const Valid = makeEndpoint({
	method: "get",
	path: "/auth/valid",
	alias: "auth/valid",
	parameters: [AuthorizationHeader],
	response: ValidResponseSchema,
	errors: ApiErrors,
});

export const Deauthorize = makeEndpoint({
	method: "delete",
	path: "/auth",
	alias: "auth/deauthorize",
	parameters: [AuthorizationHeader],
	response: ValidResponseSchema,
	errors: ApiErrors,
});

export const AuthEndpoints = narrow([
	RegisterStart,
	RegisterFinish,
	LoginStart,
	LoginFinish,
	Valid,
	Deauthorize,
]);
