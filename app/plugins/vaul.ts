import { DrawerContent, DrawerHandle, DrawerOverlay, DrawerPortal, DrawerRoot } from "vaul-vue";

export default defineNuxtPlugin((app) => {
    app.vueApp.component("DrawerRoot", DrawerRoot);
    app.vueApp.component("DrawerPortal", DrawerPortal);
    app.vueApp.component("DrawerOverlay", DrawerOverlay);
    app.vueApp.component("DrawerContent", DrawerContent);
    app.vueApp.component("DrawerHandle", DrawerHandle);
});
