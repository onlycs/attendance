<script setup lang="ts">
import {
	DrawerContent,
	DrawerHandle,
	DrawerOverlay,
	DrawerPortal,
	DrawerRoot,
} from "vaul-vue";
import { toast } from "vue-sonner";
import { z } from "zod";
import type { FocusCard } from "#components";
import { ApiClient, apiToast } from "~/utils/api";
import { makeWebsocket } from "~/utils/zodws/api";

definePageMeta({ layout: "admin-protected" });

const { $gsap } = useNuxtApp();
const route = useRoute();
const screenSize = useScreenSize();
const mobile = useMobile(screenSize);
const password = usePassword();
const token = useToken();
const transition = injectTransition();
const kind = route.params.kind as "build" | "learning" | "demo";

const size = computed(() => [64, 32, 48, 52, 64][screenSize.value]);
const backIcon = computed(
	() => ["arrow-up-01", "arrow-left-01"][+!mobile.value],
);
const title = {
	build: "Build Hours",
	learning: "Learning Days",
	demo: "Outreach Hours",
	offseason: "Offseason Hours",
}[kind];

const loading = ref(false);
const currentId = ref("");
const back = ref<InstanceType<typeof FocusCard>>();
const main = ref<HTMLDivElement>();
const studentData = new JsonDb(StudentData, []);

const websocket = makeWebsocket({
	messages: {
		AuthenticateOk: () => {
			websocket.send("Subscribe", {
				sub: "StudentData",
			});
		},
		StudentData: (_, data) => {
			if (!data) {
				studentData.reset([]);
				return;
			}

			Crypt.decrypt(data, password.value!)
				.then(async (decrypted) => {
					studentData.reset(JSON.parse(decrypted));
				})
				.catch((error) => {
					console.error("Failed to decrypt student data:", error);
					toast.error("Failed to load student data. Please try again.");
				});
		},
		Error: (_, error) => {
			if (error.meta.type === "Auth") {
				useToken().value = null;
				usePassword().value = null;
				useRouter().push("/?error=session-expired");
				return;
			}

			toast.error(error.message);
		},
	},
});

function UpdateStudentData() {
	const serialized = studentData.serialize();

	Crypt.encrypt(serialized, password.value!)
		.then((encrypted) => {
			websocket.send("Update", {
				sub: "StudentData",
				value: encrypted,
			});
		})
		.catch((error) => {
			console.error("Failed to encrypt student data:", error);
			toast.error("Failed to update student data. Please try again.");
		});
}

/// New Student Form
const NewFormSchema = z.object({
	first: z
		.string()
		.min(2, "First name is required")
		.regex(/^[A-Z]/, "Must start with a capital letter")
		.regex(/^([A-Za-z]|-)+$/, "Must only contain letters or dashes"),
	last: z
		.string()
		.min(2, "Last name is required")
		.regex(/^[A-Z]/, "Must start with a capital letter")
		.regex(/^([A-Za-z]|-)+$/, "Must only contain letters or dashes"),
});

const NewFormOpen = ref(false);

function NewFormClose() {
	if (!NewFormOpen.value) return;

	NewFormOpen.value = false;
	loading.value = false;

	toast.warning("Cancelled! You were not signed in!");
}

function NewFormSubmit(data: z.infer<typeof NewFormSchema>) {
	NewFormOpen.value = false;
	studentData.insert({
		id: currentId.value,
		...data,
	});

	UpdateStudentData();
	roster(undefined);
}

/// Force Sign Out Form
const ForceFormOpen = ref(false);

function ForceFormClose() {
	if (!ForceFormOpen.value) return;

	ForceFormOpen.value = false;
	loading.value = false;

	toast.warning("Cancelled! You were not signed out!");
}

function ForceFormSubmit() {
	ForceFormOpen.value = false;
	roster(undefined, true);
}

async function roster(id?: string, force = false) {
	loading.value = true;

	if (id) currentId.value = id;
	else id = currentId.value;

	if (!id) {
		toast.error("Something went wrong. Please try again.");
		loading.value = false;
		return;
	}

	const existsRes = studentData.get({ id }).length > 0;

	if (!existsRes) {
		NewFormOpen.value = true;
		return;
	}

	const res = await ApiClient.fetch(
		"roster",
		{ id: Crypt.sha256(id), kind, force },
		{ headers: { Authorization: token.value! } },
	);

	if (res.isErr()) {
		apiToast(res.error, redirect);
		loading.value = false;
		return;
	}

	if (res.value.denied) {
		ForceFormOpen.value = true;
		return;
	}

	toast.success(`Successfully signed ${res.value.action.replace("log", "")}!`);
	loading.value = false;
}

function backHover() {
	if (mobile.value) return;
	if (!transition.ready) return;

	const target = back.value!.card!;
	const bbox = target.getBoundingClientRect();

	$gsap.to(target, {
		width: `calc(${bbox.width}px + 2rem)`,
		x: "-1rem",
		...Timing.in,
	});

	$gsap.to(main.value!, {
		x: "-1rem",
		...Timing.in,
	});
}

function backUnhover() {
	if (mobile.value) return;
	if (!transition.ready) return;

	const target = back.value!.card!;
	const bbox = target.getBoundingClientRect();

	$gsap.to(target, {
		width: `calc(${bbox.width}px - 2rem)`,
		x: "0rem",
		...Timing.out,
	});

	$gsap.to(main.value!, {
		x: "0rem",
		...Timing.out,
	});
}

function redirect(url: string) {
	transition.out.trigger({ reverse: true }).then(() => useRouter().push(url));
}

function exit() {
	redirect("/attendance?reverse=true");
}

onMounted(() => {
	websocket.send("Authenticate", { token: token.value! });

	transition.in.trigger();
});
</script>

<template>
	<div class="header page-transition">
		{{ title ?? "Attendance" }}
	</div>

	<div class="container">
		<FocusCards :animate="false" :length="1" show-text>
			<FocusCard class="card" title="Back" :icon="`hugeicons:${backIcon}`" ref="back"  @mouseenter="backHover" @mouseleave="backUnhover" @click="exit" />
		</FocusCards>
		<div class="box" ref="main">
			<div class="textbox">
				<Icon name="hugeicons:mortarboard-01" :size="size" :customize="Customize.StrokeWidth(0.5)" mode="svg" />
				Student ID
			</div>

			<div class="form-container">
				<SizeDependent>
					<FormStudentId :size="screenSize === 1 ? 'md' : 'lg'" :loading="loading" @submit="roster" autofocus />
				</SizeDependent>
			</div>

			<div />
		</div>
	</div>

	<DrawerRoot should-scale-background :open="ForceFormOpen" @close="ForceFormClose">
		<DrawerPortal>
			<DrawerOverlay class="drawer-overlay" />
			<DrawerContent class="dialog force">
				<DrawerHandle class="handle" />

				<div class="title">
					Are you sure?
				</div>

				You signed in less than three minutes ago


				<div class="buttons">
					<Button kind="error" @click="ForceFormSubmit">
						Sign me out!
					</Button>

					<Button kind="card-2" @click="ForceFormClose">
						Keep me in
					</Button>
				</div>
			</DrawerContent>
		</DrawerPortal>
	</DrawerRoot>

	<DrawerRoot should-scale-background :open="NewFormOpen" @close="NewFormClose">
		<DrawerPortal>
			<DrawerOverlay class="drawer-overlay" />
			<DrawerContent class="dialog new">
				<DrawerHandle class="handle" />

				<div class="title">
					New Student
				</div>

				<Form
					@cancel="NewFormClose"
					@submit="NewFormSubmit"
					:schema="NewFormSchema"
					:meta="{
						first: {
							title: 'First Name',
							placeholder: 'John',
						},
						last: {
							title: 'Last Name',
							placeholder: 'Doe',
						},
					}"
				/>
			</DrawerContent>
		</DrawerPortal>
	</DrawerRoot>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.container {
	@apply flex flex-col md:flex-row justify-center items-center;
	@apply gap-8;
}

.box {
	@apply relative bg-drop rounded-lg flex flex-col items-center;
	@apply max-md:w-[calc(100%-1.5rem)] md:w-[28rem] lg:w-[36rem] xl:w-[42rem] 2xl:w-[48rem];
	@apply md:h-full h-[24rem];
}

.textbox {
	@apply flex justify-center items-center gap-6;
	@apply mt-8 text-xl md:text-lg lg:text-xl select-none;
}

.header {
	@apply absolute top-10;
	@apply text-4xl max-md:hidden;
	@apply select-none;
}

.form-container {
	@apply absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[calc(-50%+1rem)];
}

.dialog.force {
	@apply h-72;

	.title {
		@apply mb-2;
	}

	.buttons {
		@apply flex flex-col gap-4;
		@apply w-full max-md:px-8 md:w-96 mt-8;

		button {
			@apply w-full;
		}
	}
}
</style>

<style>
@reference '~/style/tailwind.css';

.container > div.card-container > div.card {
	@apply w-[calc(100%-1.5rem)] md:w-36 lg:w-42 xl:w-52 2xl:w-60;
	@apply h-36 md:h-52 lg:h-72 xl:h-84 2xl:h-92;
}

.container > div.card-container {
	@apply max-md:w-full;
}
</style>
