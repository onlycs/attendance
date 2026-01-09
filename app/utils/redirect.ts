import { toast } from "vue-sonner";

export type RedirectToast = "session-expired" | "unauthorized" | "404" | "onboard";

const meta = {
    messages: {
        "session-expired": "Your session has expired. Please log in again.",
        "onboard": "Onboard success! Please sign in.",
        "404": "That page does not exist",
        "unauthorized": "You do not have permission to access that page.",
    } satisfies Record<RedirectToast, string>,
    status: {
        "session-expired": "error",
        "unauthorized": "error",
        "404": "error",
        "onboard": "success",
    } satisfies Record<RedirectToast, "error" | "success" | "info" | "warning">,
} as const;

type Router = ReturnType<typeof useRouter>;
type RouterFunction = {
    [K in keyof Router]: Router[K] extends (url: string) => unknown ? K : never;
}[keyof Router];

export function redirect(
    to: string,
    router: ReturnType<typeof useRouter>,
    options: {
        throw?: RedirectToast;
        using?: RouterFunction;
    } = {},
) {
    const method = options.using || "push";
    const url = options.throw ? `${to}${to.includes("?") ? "&" : "?"}throw=${options.throw}` : to;

    (router[method] as (url: string) => Promise<unknown>)(url);
}

export function handleRedirectQuery() {
    const route = useRoute();
    const message = route.query.throw as RedirectToast | undefined;

    if (message && meta.messages[message]) {
        toast[meta.status[message]](meta.messages[message]);
    }

    route.query.throw = null;
}
