<script setup lang="ts">
import {
	DrawerContent,
	DrawerHandle,
	DrawerOverlay,
	DrawerPortal,
	DrawerRoot,
} from "vaul-vue";
import type { ComponentPublicInstance } from "vue";
import type { RequireStorage } from "#components";
import type { PasswordSubmitEvent } from "~/components/forms/Password.vue";
import DefaultLayout from "./Default.vue";

const password = usePassword();
const ok = computed((old) => old || !!password.value); // prevent ok==false b/c password is null right before unmount
const forceClose = ref(false);
const isMobile = useMobile();
const router = useRouter();

const layout = ref<InstanceType<typeof DefaultLayout>>();

function redirect() {
	forceClose.value = true;

	if (ok.value) return;

	layout.value?.transition.out.trigger().then(() => {
		useToken().value = null;
		router.push("/");
	});
}

function submit(event: PasswordSubmitEvent) {
	password.value = event.password;
	event.stopLoading();
}

onMounted(() => {
	window.addEventListener("keydown", (event) => {
		if (event.key === "Escape") redirect();
	});
});
</script>

<template>
	<DefaultLayout ref="layout">
		<RequireStorage :actions="narrow([Actions.TokenMissing])">
			<slot />
		</RequireStorage>
		
		<DrawerRoot class="absolute" should-scale-background :open="!ok && !forceClose" @close="redirect">
			<DrawerPortal>
				<DrawerOverlay @click="redirect" />
				<DrawerContent class="dialog password">
					<DrawerHandle class="handle" />

					<div class="title">
						Enter Password to Continue
					</div>

					<div class="form">
						<SizeDependent>
							<FormPassword :size="isMobile ? 'md' : 'lg'" @submit="submit" />
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
	@apply rounded-t-lg ;
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