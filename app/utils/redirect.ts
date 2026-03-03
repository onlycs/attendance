import { toast } from "vue-sonner";

export type RedirectToast =
    | "session-expired"
    | "unauthorized"
    | "404"
    | "bad-qr"
    | "onboard";

const meta = {
    messages: {
        "session-expired": "Your session has expired. Please log in again.",
        onboard: "Onboard success! Please sign in.",
        "404": "That page does not exist",
        unauthorized: "You do not have permission to access that page.",
        "bad-qr": "The QR code you scanned is invalid.",
    } satisfies Record<RedirectToast, string>,
    status: {
        "session-expired": "error",
        unauthorized: "error",
        "404": "error",
        onboard: "success",
        "bad-qr": "error",
    } satisfies Record<RedirectToast, "error" | "success" | "info" | "warning">,
} as const;

export const redirect = {
    build(to: string, message?: RedirectToast) {
        return message
            ? `${to}${to.includes("?") ? "&" : "?"}throw=${message}`
            : to;
    },
};

export function handleRedirectQuery() {
    const route = useRoute();
    const message = route.query.throw as RedirectToast | undefined;

    if (message && meta.messages[message]) {
        toast[meta.status[message]](meta.messages[message]);
    }

    useRouter().replace({ query: {} });
}
