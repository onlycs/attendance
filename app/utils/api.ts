import { makeApi, makeErrors, makeParameters, Zodios } from "@zodios/core";
import type {
	ReadonlyDeep,
	RequiredKeys,
	UndefinedIfNever,
} from "@zodios/core/lib/utils.types";
import type {
	Aliases,
	Method,
	MutationMethod,
	ZodiosAliasRequest,
	ZodiosBodyByAlias,
	ZodiosBodyByPath,
	ZodiosEndpointDefinitionByAlias,
	ZodiosMatchingErrorsByAlias,
	ZodiosMatchingErrorsByPath,
	ZodiosMutationAliasRequest,
	ZodiosPathsByMethod,
	ZodiosRequestOptionsByAlias,
	ZodiosRequestOptionsByPath,
	ZodiosResponseByAlias,
	ZodiosResponseByPath,
} from "@zodios/core/lib/zodios.types";
import { ResultAsync } from "neverthrow";
import { toast } from "vue-sonner";
import { z } from "zod";

declare global {
	const __API_URL__: string;
}

export const API_URL = __API_URL__;

const ErrorSchema = makeErrors([
	{
		status: 401,
		schema: z.string(),
	},
	{
		status: 404,
		schema: z.never(),
	},
	{
		status: 500,
		schema: z.string(),
	},
]);

const AuthParam = makeParameters([
	{
		name: "Authorization",
		type: "Header",
		schema: z.string(),
	},
]);

const HoursSchema = z.object({
	learning: z.number(),
	build: z.number(),
	demo: z.number(),
});

const TokenSchema = z.object({
	token: z.string(),
	expires: z.string(),
});

const RosterSchema = z.object({
	action: z.enum(["login", "logout"]),
	denied: z.boolean(),
});

const CsvSchema = z.object({
	csv: z.string(),
});

export const HourTypeSchema = z.enum(["learning", "build", "demo"]);

export const ApiSchema = makeApi([
	{
		method: "post",
		path: "/auth",
		alias: "login",
		parameters: [
			{
				name: "Login Request",
				type: "Body",
				schema: z.object({
					password: z.string(),
				}),
			},
		],
		response: TokenSchema,
		errors: ErrorSchema,
	},
	{
		method: "get",
		path: "/student/:id/exists",
		alias: "studentExists",
		response: z.boolean(),
		errors: ErrorSchema,
	},
	{
		method: "get",
		path: "/auth",
		alias: "checkToken",
		parameters: [...AuthParam],
		response: z.object({}),
		errors: ErrorSchema,
	},
	{
		method: "get",
		path: "/student/:id/hours",
		alias: "studentHours",
		response: HoursSchema,
		errors: ErrorSchema,
	},
	{
		method: "post",
		path: "/roster",
		alias: "roster",
		parameters: [
			{
				name: "Roster Request",
				type: "Body",
				schema: z.object({
					id: z.string(),
					kind: HourTypeSchema,
					force: z.boolean().default(false),
				}),
			},
			...AuthParam,
		],
		response: RosterSchema,
		errors: ErrorSchema,
	},
	{
		method: "get",
		path: "/hours.csv",
		alias: "csv",
		parameters: AuthParam,
		response: CsvSchema,
		errors: ErrorSchema,
	},
]);

const NonMutableMethods = ["get", "delete", "head", "options"] as Array<
	Omit<Method, MutationMethod>
>;

function isMutation(method: Method): method is MutationMethod {
	return !NonMutableMethods.includes(method);
}

type Api = typeof ApiSchema;

type AliasMethod<Alias extends Aliases<Api>> = ZodiosEndpointDefinitionByAlias<
	Api,
	Alias
>[number]["method"];
type AliasBody<Alias extends Aliases<Api>> = ZodiosBodyByAlias<Api, Alias>;
type AliasOptions<Alias extends Aliases<Api>> = ZodiosRequestOptionsByAlias<
	Api,
	Alias
>;
type AliasResponse<Alias extends Aliases<Api>> = ZodiosResponseByAlias<
	Api,
	Alias
>;
type AliasFunctionGet<Alias extends Aliases<Api>> = ZodiosAliasRequest<
	AliasOptions<Alias>,
	AliasResponse<Alias>
>;
type AliasFunctionMut<Alias extends Aliases<Api>> = ZodiosMutationAliasRequest<
	AliasBody<Alias>,
	AliasOptions<Alias>,
	AliasResponse<Alias>
>;
type AliasErrors<Alias extends Aliases<Api>> = FixedError<
	ZodiosMatchingErrorsByAlias<Api, Alias>
>;

type Paths<M extends Method> = ZodiosPathsByMethod<Api, M>;
type PathMethodBody<M extends Method, Path extends Paths<M>> = ZodiosBodyByPath<
	Api,
	M,
	Path
>;
type PathMethodOptions<
	M extends Method,
	Path extends Paths<M>,
> = ZodiosRequestOptionsByPath<Api, M, Path>;
type PathMethodResponse<
	M extends Method,
	Path extends Paths<M>,
> = ZodiosResponseByPath<Api, M, Path>;
type PathMethodErrors<M extends Method, Path extends Paths<M>> = FixedError<
	ZodiosMatchingErrorsByPath<Api, M, Path>
>;

type Optionalize<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type FixedError<E extends { response: unknown }> = Optionalize<E, "response">;
type MethodError<M extends Method> = PathMethodErrors<M, Paths<M>>;

export type HoursResponse = z.infer<typeof HoursSchema>;
export type LoginResponse = z.infer<typeof TokenSchema>;
export type RouterResponse = z.infer<typeof RosterSchema>;
export type CsvResponse = z.infer<typeof CsvSchema>;
export type RosterAction = z.infer<typeof RosterSchema>["action"];
export type HourType = z.infer<typeof HourTypeSchema>;
export type AnyError = MethodError<Method>;

export const ApiClient = {
	client: new Zodios(API_URL, ApiSchema),

	fetch<const M extends Method, const Path extends Paths<M>>(
		method: M,
		path: Path,
		...remainder: M extends MutationMethod
			? RequiredKeys<PathMethodOptions<M, Path>> extends never
				? [
						body: ReadonlyDeep<UndefinedIfNever<PathMethodBody<M, Path>>>,
						options?: ReadonlyDeep<PathMethodOptions<M, Path>>,
					]
				: [
						body: ReadonlyDeep<UndefinedIfNever<PathMethodBody<M, Path>>>,
						options: ReadonlyDeep<PathMethodOptions<M, Path>>,
					]
			: RequiredKeys<PathMethodOptions<M, Path>> extends never
				? [options?: ReadonlyDeep<PathMethodOptions<M, Path>>]
				: [options: ReadonlyDeep<PathMethodOptions<M, Path>>]
	) {
		const [a, b] = remainder;

		const body = isMutation(method) ? a : undefined;
		const options = body ? b : a;

		let res: Promise<PathMethodResponse<M, Path>>;
		if (isMutation(method)) {
			res = this.client.request({
				...(options ?? {}),
				method,
				url: path,
				data: body,
			} as any) as any;
		} else {
			res = this.client.request({
				...(options ?? {}),
				method,
				url: path,
			} as any) as any;
		}

		return ResultAsync.fromPromise(res, (e) => e as PathMethodErrors<M, Path>);
	},

	alias<const Alias extends Aliases<Api>>(
		alias: Alias,
		...remainder: AliasMethod<Alias> extends MutationMethod
			? RequiredKeys<AliasOptions<Alias>> extends never
				? [
						body: ReadonlyDeep<UndefinedIfNever<AliasBody<Alias>>>,
						options?: ReadonlyDeep<AliasOptions<Alias>>,
					]
				: [
						body: ReadonlyDeep<UndefinedIfNever<AliasBody<Alias>>>,
						options: ReadonlyDeep<AliasOptions<Alias>>,
					]
			: RequiredKeys<AliasOptions<Alias>> extends never
				? [options?: ReadonlyDeep<AliasOptions<Alias>>]
				: [options: ReadonlyDeep<AliasOptions<Alias>>]
	) {
		const [a, b] = remainder;

		const body: ReadonlyDeep<UndefinedIfNever<AliasBody<Alias>>> | undefined =
			isMutation(ApiSchema.find((ep) => ep.alias === alias)!.method)
				? (a as unknown as ReadonlyDeep<UndefinedIfNever<AliasBody<Alias>>>)
				: undefined;

		const options = body ? b : a;

		let res: Promise<AliasResponse<Alias>>;
		if (
			NonMutableMethods.includes(
				ApiSchema.find((ep) => ep.alias === alias)!.method,
			)
		) {
			res = (this.client[alias] as unknown as AliasFunctionGet<Alias>)(
				options!,
			);
		} else {
			res = (this.client[alias] as unknown as AliasFunctionMut<Alias>)(
				body!,
				options!,
			);
		}

		return ResultAsync.fromPromise(res, (e) => e as AliasErrors<Alias>);
	},
};

export function apiToast(err: AnyError, redirect: (url: string) => void) {
	if (!err.response) {
		toast.error("Could not connect to the server. Are you online?");
		return;
	}

	switch (err.response.status as number) {
		case 401: {
			redirect("/?error=session-expired");
			return;
		}
		case 404: {
			toast.error(
				"Could not find data from the server. This is probably a bug",
			);
			return;
		}
		case 500: {
			toast.error("There was a problem with the server. This is a bug");
			return;
		}
	}

	toast.error(err.response.data);
}
