import {
    useLocalStorage as useLocalStoragePrim,
    useSessionStorage as useSessionStoragePrim,
    type UseStorageOptions,
} from "@vueuse/core";
import api, { type Claims } from "~/utils/api";

export const Keys = narrow({
    Auth: "auth",
    K1: "k1",
});

const storage = {
    session(
        key: string,
        options?: UseStorageOptions<string | null>,
    ) {
        return useSessionStoragePrim(key, null as string | null, options);
    },

    local(
        key: string,
        options?: UseStorageOptions<string | null>,
    ) {
        return useLocalStoragePrim(key, null as string | null, options);
    },
};

type AuthLocalStorage = { jwt: string; } | { studentid: string; };
type AuthSessionStorage = { k1: string; };

function useLocalAuth(): Ref<AuthLocalStorage | null> {
    const local = storage.local(Keys.Auth);

    return computedWithControl(local, {
        get() {
            if (!local.value) return null;
            return JSON.parse(atob(local.value)) as AuthLocalStorage;
        },
        set(val: AuthLocalStorage | null) {
            if (!val) {
                local.value = null;
                return;
            }

            local.value = btoa(JSON.stringify(val));
        },
    });
}

function useSessionAuth(): Ref<AuthSessionStorage | null> {
    const session = storage.session(Keys.K1);

    return computedWithControl(session, {
        get() {
            if (!session.value) return null;
            return JSON.parse(atob(session.value)) as AuthSessionStorage;
        },
        set(val: AuthSessionStorage | null) {
            if (!val) {
                session.value = null;
                return;
            }

            session.value = btoa(JSON.stringify(val));
        },
    });
}

export type AuthAdmin = {
    ok: true;
    jwt: string;
    claims: Claims;
    k1: string;
} | {
    ok: false;
    jwt: string;
    claims: Claims;
};

export type AuthStudent = {
    id: string;
};

export type AuthData =
    | ({ role: "student"; } & AuthStudent)
    | ({ role: "admin"; } & AuthAdmin)
    | ({ role: "none"; });

export type User = Ref<AuthData>;
export interface Auth {
    admin(username: string, password: string): Promise<{ ok: boolean; }>;
    student(id: string): void;
    clear(): void;
}

export default defineNuxtPlugin(() => {
    const local = useLocalAuth();
    const session = useSessionAuth();

    function mkclaims(jwt: string): Claims {
        const middle = jwt.split(".")[1]!;
        return JSON.parse(atob(middle)) as Claims;
    }

    function snapshot(): AuthData {
        if (!local.value) return { role: "none" };
        else if ("jwt" in local.value) {
            const jwt = local.value.jwt;
            const claims = mkclaims(jwt);

            return {
                role: "admin",
                jwt,
                claims,
                ok: !!session.value,
                k1: session.value?.k1 ?? "",
            };
        } else {
            return {
                role: "student",
                id: local.value.studentid,
            };
        }
    }

    const user = ref(snapshot());

    watch([local, session], () => {
        user.value = snapshot();
    });

    const auth: Auth = {
        async admin(username, password) {
            const start = await api.auth.login.start({
                query: { username },
            });

            if (!start.data) {
                api.error(start.error, start.response);
                return { ok: false };
            }

            const { A, M1 } = await srp.login(start.data!, username, password);

            const complete = await api.auth.login.finish({
                body: {
                    session: start.data.session,
                    a: hex.from(A),
                    m1: hex.from(M1),
                },
            });

            if (!complete.data) {
                api.error(complete.error, complete.response);
                return { ok: false };
            }

            const { jwt } = complete.data;
            const crypto = useCrypto();
            const local = useLocalAuth();
            const session = useSessionAuth();
            const k1 = await crypto.k1.decrypt(mkclaims(jwt).k1e, password);
            const k1s = k1 ? hex.from(k1) : undefined;

            local.value = { jwt };
            session.value = k1s ? { k1: k1s } : null;

            return { ok: true };
        },
        student(id) {
            const local = useLocalAuth();
            local.value = { studentid: id };
        },
        clear() {
            const local = useLocalAuth();
            const session = useSessionAuth();

            local.value = null;
            session.value = null;
        },
    };

    return { provide: { auth, user } };
});
