import { gsap } from "gsap";
import { Draggable, MorphSVGPlugin, TextPlugin } from "gsap/all";

gsap.registerPlugin(MorphSVGPlugin);
gsap.registerPlugin(TextPlugin);
gsap.registerPlugin(Draggable);

export default defineNuxtPlugin((app) => {
    app.provide("gsap", gsap);
    app.provide("gsapPlugins", {
        morph: MorphSVGPlugin,
        text: TextPlugin,
        drag: Draggable,
    });
});
