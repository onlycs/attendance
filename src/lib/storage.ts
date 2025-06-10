import { useCookies } from "next-client-cookies";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Option } from "./optional";
import { None, OptionOf, Some } from "./optional";

export function useSessions<const T extends string>(keys: T[]) {
	const [values, setValues] = useState<Record<T, Option<string>>>(() =>
		keys.reduce(
			(acc, k) => {
				const stored =
					typeof window !== "undefined" ? sessionStorage.getItem(k) : null;
				acc[k] = OptionOf(stored);
				return acc;
			},
			{} as Record<T, Option<string>>,
		),
	);

	useEffect(() => {
		const onStorage = (e: StorageEvent) => {
			if (e.key && keys.includes(e.key as T)) {
				setValues((prev) => ({
					...prev,
					[e.key as T]: OptionOf(e.newValue),
				}));
			}
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [keys]);

	const set = (key: T, value: string) => {
		sessionStorage.setItem(key, value);
		setValues((prev) => ({ ...prev, [key]: Some(value) }));
	};

	const del = (key: T) => {
		sessionStorage.removeItem(key);
		setValues((prev) => ({ ...prev, [key]: None }));
	};

	return {
		value: values,
		set,
		delete: del,
	};
}

export function useSession(key: string) {
	const { value, set, delete: del } = useSessions([key]);

	return {
		value: value[key],
		set: (value: string) => set(key, value),
		delete: () => del(key),
	};
}

export interface CookieRequirements {
	key: string;
	redirectTo?: string;
	redirectIf?: "missing" | "found";
	type?: "cookie" | "session";
}

export function useRequireStorage(requirements: CookieRequirements[]) {
	const cookies = useCookies();
	const router = useRouter();

	const [canLoad, setCanLoad] = useState(false);
	const sessions = useSessions(
		requirements.filter((req) => req.type === "session").map((req) => req.key),
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Neither requirements nor router changes
	useEffect(() => {
		const missing = requirements.find((req) => {
			const wantsMissing = req.redirectIf !== "found";
			const isCookie = req.type !== "session";

			if (isCookie) {
				return wantsMissing === !cookies.get(req.key);
			}

			return wantsMissing === sessions.value[req.key].isNone();
		});

		if (missing) {
			router.push(missing.redirectTo ?? "/");
			return;
		}

		setCanLoad(true);
	}, [sessions.value, cookies]);

	return canLoad;
}

export const StudentIdKey = "studentId";
export const EncryptionKey = "enckey";
export const TokenKey = "token";
