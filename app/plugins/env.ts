export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig();
    const url = config.public.apiUrl as string | undefined;

    globalThis.API_URL = url ?? "http://localhost:8080";
    window.API_URL = url ?? "http://localhost:8080";
});
