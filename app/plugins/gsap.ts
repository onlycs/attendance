import { gsap } from "gsap";
import { MorphSVGPlugin, TextPlugin } from "gsap/all";

gsap.registerPlugin(MorphSVGPlugin);
gsap.registerPlugin(TextPlugin);

export default defineNuxtPlugin(() => {
	return {
		provide: {
			gsap,
			gsapPlugins: {
				morph: MorphSVGPlugin,
				text: TextPlugin,
			},
		},
	};
});
