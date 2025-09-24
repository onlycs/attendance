// I really, like really, don't like type gymnastics

import { Zodios } from "@zodios/core";
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
	ZodiosEndpointDefinitionByAlias,
	ZodiosMatchingErrorsByAlias,
	ZodiosMutationAliasRequest,
	ZodiosRequestOptionsByAlias,
	ZodiosResponseByAlias,
} from "@zodios/core/lib/zodios.types";
import { ResultAsync } from "neverthrow";
import { toast } from "vue-sonner";
import type { Optionalize } from "../gymnastics";
import { type Api, ApiSchema } from "./schema";

export * from "./schema";

declare global {
	const __API_URL__: string;
}

export const API_URL = __API_URL__;

const NonMutableMethods: Array<Omit<Method, MutationMethod>> = [
	"get",
	"delete",
	"head",
	"options",
];

export function isMutation(method: Method): method is MutationMethod {
	return !NonMutableMethods.includes(method);
}

type FixedError<E extends { response: unknown }> = Optionalize<E, "response">;
type AnyError = AliasErrors<Aliases<Api>>;

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

export const ApiClient = {
	client: new Zodios(API_URL, ApiSchema),

	fetch<const Alias extends Aliases<Api>>(
		alias: Alias,
		...remainder: AliasMethod<Alias> extends MutationMethod
			? RequiredKeys<AliasOptions<Alias>> extends never
				? RequiredKeys<UndefinedIfNever<AliasBody<Alias>>> extends never
					? [
							body?: ReadonlyDeep<UndefinedIfNever<AliasBody<Alias>>>,
							options?: ReadonlyDeep<AliasOptions<Alias>>,
						]
					: [
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

export function apiToast(err: AnyError, on401?: (url: string) => void) {
	if (!err.response) {
		toast.error("Could not connect to the server. Are you online?");
		return;
	}

	switch (err.response.status as number) {
		case 401: {
			if (on401) {
				on401("/?error=session-expired");
				return;
			}
			break;
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
