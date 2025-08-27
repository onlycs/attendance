import {
	type UseStorageOptions,
	useLocalStorage as useLocalStoragePrim,
	useSessionStorage as useSessionStoragePrim,
} from "@vueuse/core";
import type { Action } from "~/components/utility/RequireStorage.vue";

export const Keys = narrow({
	Token: "token",
	Password: "password",
	StudentId: "studentId",
});

export const Actions = narrow({
	StudentIdFound: {
		name: Keys.StudentId,
		storage: "local",
		when: "found",
		redirectTo: "/student",
	},

	StudentIdMissing: {
		name: Keys.StudentId,
		storage: "local",
		when: "missing",
		redirectTo: "/",
	},

	TokenFound: {
		name: Keys.Token,
		storage: "local",
		when: "found",
		redirectTo: "/admin",
	},

	TokenMissing: {
		name: Keys.Token,
		storage: "local",
		when: "missing",
		redirectTo: "/",
	},
} satisfies Record<string, Action>);

const useSessionStorage = (
	key: string,
	options?: UseStorageOptions<string | null>,
) => useSessionStoragePrim(key, null as string | null, options);

function useLocalStorage(
	key: string,
	options?: UseStorageOptions<string | null>,
) {
	return useLocalStoragePrim(key, null as string | null, options);
}

export interface TokenStore {
	token: string;
	expires: string;
}

export function useToken(
	expiry?: MaybeRef<Date>,
	options?: UseStorageOptions<string | null>,
) {
	const token = useLocalStorage(Keys.Token, options);

	return computedWithControl(token, {
		get() {
			if (!token.value) return null;

			const parsed = JSON.parse(atob(token.value)) as TokenStore;

			if (new Date(parsed.expires) < new Date()) {
				token.value = null;
				return null;
			}

			return parsed.token;
		},

		set(value: string | null) {
			if (!value) {
				token.value = null;
				return;
			}

			if (!expiry) throw new Error("Expiry required on token set");

			const storeValue: TokenStore = {
				token: value,
				expires: expiry.toLocaleString(),
			};

			token.value = btoa(JSON.stringify(storeValue));
		},
	});
}

export function useStudentId(options?: UseStorageOptions<string | null>) {
	return useLocalStorage(Keys.StudentId, options);
}

export function usePassword(options?: UseStorageOptions<string | null>) {
	return useSessionStorage(Keys.Password, options);
}
