import type { AuthData } from "~/plugins/auth";

export function useAuth() {
    const { $auth, $user } = useNuxtApp();
    return { auth: $auth, user: $user };
}

export type AdminCreds = AuthData & { role: "admin"; ok: true; };

export function useCreds(): Ref<AdminCreds | null> {
    const { user } = useAuth();
    const creds = ref<AdminCreds | null>(null);

    watch(user, (user) => {
        if (user.role !== "admin") return;
        if (!user.ok) return;

        creds.value = user;
    }, { immediate: true });

    return creds;
}
