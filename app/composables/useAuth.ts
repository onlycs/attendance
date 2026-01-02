export function useAuth() {
    const { $auth, $user } = useNuxtApp();
    return { auth: $auth, user: $user };
}
