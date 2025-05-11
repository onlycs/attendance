import { useEffect, useState } from 'react';
import { None, Option, Some } from './optional';
import { Cookies } from 'next-client-cookies';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function useSession(key: string) {
    const [value, setValue] = useState<Option<string>>(None());
    const [effectValue, effectSetter] = useState<Option<string> | 'delete'>(None());

    useEffect(() => {
        if (effectValue === 'delete') {
            sessionStorage.removeItem(key);
            setValue(None());
            effectSetter(None());
            return;
        }

        if (effectValue.isSome()) {
            sessionStorage.setItem(key, effectValue.value);
            setValue(effectValue);
            effectSetter(None());
            return;
        }

        const storedValue = sessionStorage.getItem(key);
        setValue(Option.ofNullable(storedValue)); // map null => undefined
    }, [effectValue]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        value,
        set: (value: string) => effectSetter(Some(value)),
        delete: () => effectSetter('delete'),
    };
}

export interface CookieRequirements {
    key: string;
    redirectTo?: string;
    redirectOnMissing?: boolean;
}

export function useRequireCookies(requirements: CookieRequirements[], cookies: Cookies, router: AppRouterInstance) {
    const [canLoad, setCanLoad] = useState(false);

    useEffect(() => {
        const missing = requirements.find(req => (cookies.get(req.key) === undefined) == (req.redirectOnMissing ?? true));

        if (missing) {
            router.push(missing.redirectTo ?? '/');
            return;
        }

        setCanLoad(true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return canLoad;
}

export const StudentIdKey = 'studentId';
export const EncryptionKey = 'enckey';
export const TokenKey = 'token';
