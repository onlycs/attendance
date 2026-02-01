import type { AuthData } from "~/plugins/auth";

export function useAuth() {
    const { $auth, $user } = useNuxtApp();
    return { auth: $auth, user: $user };
}

export function useCreds(): Ref<AuthData & { role: "admin"; ok: true; } | null> {
    const { user } = useAuth();
    const creds = ref<typeof user["value"] & { role: "admin"; ok: true; } | null>(null);

    watch(user, (user) => {
        if (user.role !== "admin") return;
        if (!user.ok) return;

        creds.value = user;
    }, { immediate: true });

    return creds;
}
