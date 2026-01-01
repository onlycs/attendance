import tailwind from "@tailwindcss/vite";

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
    },
    devtools: {
        enabled: true,
        timeline: { enabled: true },
    },
    modules: [
        "@nuxt/icon",
        "@nuxt/image",
        "v-gsap-nuxt",
        "@vueuse/nuxt",
        "vue-sonner/nuxt",
        "reka-ui/nuxt",
    ],
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
                        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                        next();
                    });
                },
            },
        ],
        define: {
            __API_URL__: JSON.stringify(
                process.env.API_URL || "http://localhost:3000",
            ),
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
