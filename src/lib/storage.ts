import { useEffect, useState } from 'react';
import { None, Option, Some } from './optional';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';

export function useSessions<const T extends string>(keys: T[]) {
    const [values, setValue] = useState<Record<T, Option<string>>>(keys.reduce(
        (acc, k) => ({ ...acc, [k]: None() }),
        {} as Record<T, Option<string>>,
    ));

    const [effectValues, effectSetter] = useState<Record<T, Option<string> | 'delete'>>(keys.reduce(
        (acc, k) => ({ ...acc, [k]: None() }),
        {} as Record<T, Option<string> | 'delete'>,
    ));

    const [loaded, setLoaded] = useState(false);

    // don't set to values here
    // we trigger a StorageEvent when we set to sessionStorage
    // which is listened to in the useEffect below
    useEffect(() => {
        for (const key of keys) {
            const newValue = effectValues[key];

            if (newValue === 'delete') {
                sessionStorage.removeItem(key);
                effectSetter(prev => ({ ...prev, [key]: None() }));
                continue;
            }

            if (newValue.isSome()) {
                sessionStorage.setItem(key, newValue.value);
                effectSetter(prev => ({ ...prev, [key]: None() }));
                continue;
            }
        }
    }, [effectValues]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const store = (key: string) => {
            const storedValue = sessionStorage.getItem(key);
            setValue(prev => ({ ...prev, [key]: Option.ofNullable(storedValue) })); // map null => undefined
        };

        for (const key of keys) {
            store(key);
        }

        setLoaded(true);

        const listener = (e: StorageEvent) => {
            if (!e.key || !e.newValue) return;
            store(e.key);
        };

        window.addEventListener('storage', listener);

        return () => {
            window.removeEventListener('storage', listener);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        loaded,
        value: values,
        set: (key: T, value: string) => effectSetter(prev => ({ ...prev, [key]: Some(value) })),
        delete: (key: T) => effectSetter(prev => ({ ...prev, [key]: 'delete' })),
    };
}

export function useSession(key: string) {
    const { value, set, delete: del, loaded } = useSessions([key]);

    return {
        loaded,
        value: value[key],
        set: (value: string) => set(key, value),
        delete: () => del(key),
    };
}

export interface CookieRequirements {
    key: string;
    redirectTo?: string;
    redirectIf?: 'missing' | 'found';
    type?: 'cookie' | 'session';
}

export function useRequireStorage(requirements: CookieRequirements[]) {
    const cookies = useCookies();
    const router = useRouter();

    const [canLoad, setCanLoad] = useState(false);
    const sessions = useSessions(requirements.filter(req => req.type === 'session').map(req => req.key));

    useEffect(() => {
        const missing = requirements.find((req) => {
            const wantsMissing = req.redirectIf !== 'found';
            const isCookie = req.type !== 'session';

            if (isCookie) {
                return wantsMissing == !cookies.get(req.key);
            } else if (sessions.loaded) {
                return wantsMissing == !sessions.value[req.key].isSome();
            }
        });

        if (missing) {
            router.push(missing.redirectTo ?? '/');
            return;
        }

        setCanLoad(true);
    }, [sessions.value, sessions.loaded]); // eslint-disable-line

    return canLoad;
}

export const StudentIdKey = 'studentId';
export const EncryptionKey = 'enckey';
export const TokenKey = 'token';
