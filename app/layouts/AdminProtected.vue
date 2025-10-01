<script setup lang="ts">
import {
  DrawerContent,
  DrawerHandle,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
} from "vaul-vue";
import { useAuth } from "~/utils/auth";
import DefaultLayout from "./Default.vue";

const auth = useAuth();
const ok = ref(false);
const forceClose = ref(false);
const isMobile = useMobile();
const router = useRouter();
const app = useNuxtApp();
const drawer = ref<InstanceType<typeof DrawerRoot>>();

const layout = ref<InstanceType<typeof DefaultLayout>>();

function redirect() {
  if (ok.value) return;

  forceClose.value = true;

  layout.value?.transition.out.trigger().then(() => {
    auth.clear();
    router.push("/");
  });
}

function check() {
  forceClose.value = false;
  console.log("check", auth.admin.value.status);

  const path = router.currentRoute.value.path;
  const skippable = /^\/attendance\/(.+)$/.test(path);
  if (skippable && ok.value) return;

  ok.value = auth.admin.value.status === "ok";
  console.log(ok.value);
}

app.hook("page:finish", () => check());
watch(auth.admin, () => check(), { immediate: true });
onMounted(check);

// watch(ok, (ok) => console.log(ok, forceClose.value));

onMounted(() => {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") redirect();
  });
});
</script>

<template>
  <DefaultLayout ref="layout">
    <slot />

    <DrawerRoot class="absolute" ref="drawer" should-scale-background :open="!ok && !forceClose">
      <DrawerPortal>
        <DrawerOverlay @click="redirect" />
        <DrawerContent class="dialog password">
          <DrawerHandle class="handle" />

          <div class="title">
            Enter Password to Continue
          </div>

          <div class="form">
            <SizeDependent>
              <FormPassword :size="isMobile ? 'md' : 'lg'" />
            </SizeDependent>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </DrawerRoot>
  </DefaultLayout>
</template>

<style>
@reference "~/style/tailwind.css";

.dialog {
  @apply fixed bottom-0 right-0 left-0;
  @apply flex flex-col items-center z-50;
  @apply rounded-t-lg;
  @apply bg-card;

  &.password {
    @apply h-64;
  }

  .handle {
    @apply mb-6 mt-4;
  }

  .title {
    @apply text-xl md:text-2xl;
  }

  .form {
    @apply my-8;
  }
}
</style>
