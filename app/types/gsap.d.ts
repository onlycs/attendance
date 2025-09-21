import type { gsap } from "gsap";

declare module "#app" {
	interface NuxtApp {
		$gsap: typeof gsap;
	}
}

declare module "vue" {
	interface ComponentCustomProperties {
		$gsap: typeof gsap;
	}
}
