<script setup lang="ts">
import { Toaster } from "vue-sonner";

onLoad(handleRedirectQuery);
useRouter().beforeEach(() => useCleanup().run());
</script>

<template>
    <div id="content" ref="content" data-vaul-drawer-wrapper>
        <slot />
    </div>
    <Footer />
    <Toaster rich-colors theme="dark" position="bottom-right" />
</template>

<style scoped>
@reference "~/style/tailwind.css";

#content {
    @apply flex-1 overflow-hidden;
    @apply flex flex-col items-center justify-center;
    @apply bg-background;
    @apply w-full;
}
</style>
