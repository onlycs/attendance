<script setup lang="ts">
import { Analytics } from "@vercel/analytics/vue";
import { SpeedInsights } from "@vercel/speed-insights/vue";
import { Toaster } from "vue-sonner";
</script>

<template>
    <SpeedInsights />
    <Analytics />

    <div id="content" ref="content" data-vaul-drawer-wrapper>
        <slot />
    </div>
    <Footer />
    <Toaster rich-colors theme="dark" position="top-right" />
</template>

<style scoped>
@reference "~/style/tailwind.css";

#content {
    @apply flex-1 overflow-hidden;
    @apply flex flex-col justify-center items-center;
    @apply bg-background;
    @apply w-full;
}
</style>
