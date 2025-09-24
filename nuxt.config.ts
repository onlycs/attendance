import tailwind from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';
import tla from 'vite-plugin-top-level-await';

export default defineNuxtConfig({
	app: {
		head: {
			title: "Attendance",
			htmlAttrs: {
				class: "dark",
			},
			link: [
				{ rel: "icon", type: "image/png", href: "/favicon.png" },
			]
		},
	},
	components: [
		{ path: "~/components/ui/input-otp", prefix: "OTP" },
		{ path: "~/components/forms", prefix: "Form" },
		{ path: "~/components", pathPrefix: false },
	],
	devtools: {
		enabled: true,

		timeline: {
			enabled: true
		}
	},
	modules: [
		"@nuxt/icon",
		"@nuxt/image",
		"v-gsap-nuxt",
		"@vueuse/nuxt",
		"vue-sonner/nuxt",
	],
	pages: true,
	css: ["~/style/tailwind.css"],
	postcss: {
		plugins: {
			autoprefixer: {},
		},
	},
	vite: {
		plugins: [tailwind(), wasm(), tla()],
		define: {
			__API_URL__: JSON.stringify(process.env.API_URL || "http://localhost:3000"),
		}
	},
	icon: {
		serverBundle: {
			collections: ["hugeicons"]
		}
	},
	compatibilityDate: '2025-08-18'
});