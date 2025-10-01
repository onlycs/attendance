import {
	type UseStorageOptions,
	useLocalStorage as useLocalStoragePrim,
	useSessionStorage as useSessionStoragePrim,
} from "@vueuse/core";
import { Temporal } from "temporal-polyfill";
import { ZonedDateTime } from "temporal-zod";
import type { WatchSource } from "vue";
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

const useSessionStorage = memoize(
	(key: string, options?: UseStorageOptions<string | null>) => {
		return useSessionStoragePrim(key, null as string | null, options);
	},
);

const useLocalStorage = memoize(
	(key: string, options?: UseStorageOptions<string | null>) => {
		return useLocalStoragePrim(key, null as string | null, options);
	},
);

export interface TokenStore {
	token: string;
	expires: string;
}

function useToken(
	options?: UseStorageOptions<string | null>,
): Ref<{ token: string; expiry?: Temporal.ZonedDateTime } | null> {
	const current = useLocalStorage(Keys.Token, options);

	return computedWithControl(current, {
		get() {
			if (!current.value) return null;

			const parsed = JSON.parse(atob(current.value)) as TokenStore;

			const expiry = Temporal.ZonedDateTime.from(parsed.expires);
			const now = Temporal.Now.zonedDateTimeISO();

			if (Temporal.ZonedDateTime.compare(now, expiry) >= 0) {
				current.value = null;
				return null;
			}

			return { token: parsed.token, expiry };
		},

		set(next: { token: string; expiry?: Temporal.ZonedDateTime } | null) {
			if (!next) {
				current.value = null;
				return;
			}

			if (typeof next === "string") {
				next = { token: next };
			}

			if (!next.expiry && !current.value)
				throw new Error("Expiry required on first token set");

			const expiry =
				next.expiry ??
				ZonedDateTime.from(JSON.parse(atob(current.value!)).expires);

			const storeValue: TokenStore = {
				token: next.token,
				expires: expiry.toString(),
			};

			current.value = btoa(JSON.stringify(storeValue));
		},
	});
}

function useStudentId(options?: UseStorageOptions<string | null>) {
	return useLocalStorage(Keys.StudentId, options);
}

function usePassword(options?: UseStorageOptions<string | null>) {
	return useSessionStorage(Keys.Password, options);
}

export class AuthState {
	private data: {
		id: Ref<string | null>;
		token: Ref<{ token: string; expiry?: Temporal.ZonedDateTime } | null>;
		password: Ref<string | null>;
	} = {
		id: useStudentId(),
		token: useToken(),
		password: usePassword(),
	};

	protected setAdmin(
		password: string,
		token: string,
		expiry?: Temporal.ZonedDateTime,
	) {
		this.data.token.value = { token, expiry };
		this.data.password.value = password;
	}

	admin: Ref<
		| {
				status: "ok";
				token: Ref<{ token: string; expiry: Temporal.ZonedDateTime }>;
				password: Ref<string>;
		  }
		| {
				status: "pending-all";
				set: (
					password: string,
					token: string,
					expiry: Temporal.ZonedDateTime,
				) => void;
		  }
		| {
				status: "pending-password";
				set: (password: string) => void;
				reset: (
					password: string,
					token: string,
					expiry: Temporal.ZonedDateTime,
				) => void;
		  }
	> = computedWithControl(
		[this.data.password, this.data.token] as WatchSource[],
		() => {
			if (
				!this.data.token ||
				!this.data.password ||
				!this.data.token.value ||
				!this.data.password.value
			)
				return { status: "pending-all", set: this.setAdmin.bind(this) };

			if (!this.data.password.value)
				return {
					status: "pending-password",
					set: (password: string) => {
						this.data.password.value = password;
					},
					reset: this.setAdmin.bind(this),
				};

			return {
				status: "ok",
				token: this.data.token as Ref<{
					token: string;
					expiry: Temporal.ZonedDateTime;
				}>,
				password: this.data.password as Ref<string>,
			};
		},
	);

	protected setStudent(studentId: string) {
		this.data.id.value = studentId;
	}

	student: Ref<
		| { status: "ok"; id: Ref<string> }
		| { status: "pending"; set: (id: string) => void }
	> = computed(() => {
		if (!this.data.token.value || !this.data.password.value)
			return { status: "pending", set: this.setStudent.bind(this) };

		return {
			status: "ok",
			id: this.data.id as Ref<string>,
		};
	});

	clear() {
		this.data.id.value = null;
		this.data.token.value = null;
		this.data.password.value = null;
	}
}

export function useAuth(): AuthState {
	return new AuthState();
}
