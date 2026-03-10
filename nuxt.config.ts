import tailwind from "@tailwindcss/vite";
import { HourTypeLabels } from "./app/utils/api/strings";

export default defineNuxtConfig({
    app: {
        head: {
            title: "Attendance",
            htmlAttrs: {
                class: "dark",
            },
            link: [{ rel: "icon", type: "image/png", href: "/favicon.png" }],
            meta: [
                {
                    name: "viewport",
                    content: "width=device-width, initial-scale=1",
                },
            ],
        },
    },
    components: [
        { path: "~/components/ui/form/otp", prefix: "OTP" },
        { path: "~/components/editor", prefix: "Editor" },
        { path: "~/components/sidebar", prefix: "Sidebar" },
        { path: "~/components/attendance", prefix: "Attendance" },
        { path: "~/components/attendance/dialog", prefix: "Attendance" },
        { path: "~/components/widget", prefix: "Widget" },
        { path: "~/components/telemetry", prefix: "Telemetry" },
        { path: "~/components", pathPrefix: false },
    ],
    nitro: {
        routeRules: {
            "/**": {
                headers: {
                    "Cross-Origin-Embedder-Policy": "require-corp",
                    "Cross-Origin-Opener-Policy": "same-origin",
                },
            },
        },
        prerender: {
            routes: Object.keys(HourTypeLabels).map(
                (type) => `/attendance/${type}`,
            ),
        },
    },
    devtools: { enabled: false },
    modules: ["@nuxt/icon", "@vueuse/nuxt", "vue-sonner/nuxt"],
    pages: true,
    css: ["~/style/tailwind.css"],
    postcss: {
        plugins: {
            autoprefixer: {},
        },
    },
    vite: {
        plugins: [
            tailwind(),
            {
                name: "headers",
                configureServer(server) {
                    server.middlewares.use((req, res, next) => {
                        res.setHeader(
                            "Cross-Origin-Embedder-Policy",
                            "require-corp",
                        );
                        res.setHeader(
                            "Cross-Origin-Opener-Policy",
                            "same-origin",
                        );
                        next();
                    });
                },
            },
        ],
        worker: {
            format: "es",
        },
        build: {
            rollupOptions: {
                external: ["/wasm/attendance_crypto.js"],
            },
        },
    },
    icon: {
        serverBundle: {
            collections: ["hugeicons"],
        },
    },
    ssr: false,
    compatibilityDate: "2025-08-18",
});
