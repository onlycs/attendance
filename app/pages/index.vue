<script setup lang="ts">
import { toast } from "vue-sonner";
import type { FocusCard, FocusCards } from "#components";
import type { PasswordSubmitEvent } from "~/components/forms/Password.vue";
import { ApiClient, apiToast } from "~/utils/api";

const { $gsap } = useNuxtApp();

const active = ref<Option<"student" | "admin">>(None);
const atStart = ref<boolean>(true);
const atEnd = ref<boolean>(false);
const hovered = ref<boolean>(false);

const cards = ref<InstanceType<typeof FocusCards>>();
const student = ref<InstanceType<typeof FocusCard>>();
const admin = ref<InstanceType<typeof FocusCard>>();

const adminForm = ref<HTMLDivElement>();
const studentForm = ref<HTMLDivElement>();

const params = useUrlSearchParams();
const screenSize = useScreenSize();
const mobile = computed(() => screenSize.value === 0);

const transition = injectTransition();
const router = useRouter();

const auth = useAuth();

function activeRef(using?: string) {
	const cmpValue = using
		? using
		: active.value.isSome()
			? active.value.value
			: undefined;

	if (!cmpValue) return;
	if (cmpValue === "student") return student;
	else return admin;
}

function activeForm(using?: string) {
	const cmpValue = using
		? using
		: active.value.isSome()
			? active.value.value
			: undefined;

	if (!cmpValue) return;
	if (cmpValue === "student") return studentForm;
	else return adminForm;
}

function unactiveRef(using?: string) {
	const cmpValue = using
		? using
		: active.value.isSome()
			? active.value.value
			: undefined;

	if (!cmpValue) return;
	if (cmpValue === "student") return admin;
	else return student;
}

function backClick() {
	if (!active.value.isSome()) return;
	const wasActive = active.value.value;

	const isMobile = mobile.value;
	const current = activeRef();
	const icon = current?.value?.icon;
	const card = current?.value?.card;
	const title = current?.value?.title;
	const titleText = wasActive.slice(0, 1).toUpperCase() + wasActive.slice(1);
	const other = unactiveRef()?.value?.card;
	const container = cards.value?.container;
	const form = activeForm()?.value;

	if (!icon || !card || !title || !other || !container || !form) return;

	atEnd.value = false;
	hovered.value = false;
	active.value = None;

	const x = card.getBoundingClientRect().width / 2;
	const y = card.getBoundingClientRect().height / 3;

	$gsap.to(form, {
		x: !isMobile ? `${x + Convert.remToPx(PreTranslateOffset + 0.75)}px` : "",
		y: isMobile ? `${y + Convert.remToPx(PreTranslateOffset + 0.75)}px` : "",
		opacity: 0,
		...Timing.out,
	});

	$gsap.to(title, {
		text: titleText,
		...Timing.out,
	});

	const from = icon.$el.children[0] as SVGGElement;
	const to = icon.$el.children[1] as SVGGElement;

	$gsap.to(from.children[0] as SVGPathElement, {
		morphSVG: to.children[0] as SVGPathElement,
		...Timing.fast.out,
	});

	$gsap.to(from.children[1] as SVGPathElement, {
		morphSVG: to.children[1] as SVGPathElement,
		...Timing.fast.out,
	});

	$gsap.set(other, {
		x: !isMobile ? `-${PreTranslateOffset}rem` : "",
		y: isMobile ? `-${PreTranslateOffset}rem` : "",
		opacity: 0,
	});

	$gsap.to(other, {
		x: 0,
		y: 0,
		opacity: 1,
		clearProps: "all",
		...Timing.out,
	});

	$gsap.to(card, {
		left: "0",
		top: "0",
		height: "",
		width: "",
		clearProps: "all",
		...Timing.out,
	});

	$gsap.set(container, { height: "", width: "" });

	setTimeout(() => {
		atStart.value = true;
		$gsap.set(form, {
			x: "-100vw",
		});
	}, Timing.in.duration * 1000);
}

function click(clicked: "student" | "admin") {
	if (active.value.isSome()) return backClick();

	const isMobile = mobile.value;
	const current = activeRef(clicked);
	const icon = current?.value?.icon;
	const card = current?.value?.card;
	const title = current?.value?.title;
	const other = unactiveRef(clicked)?.value?.card;
	const container = cards.value?.container;
	const form = activeForm(clicked)?.value;

	if (!card || !title || !container || !icon || !other || !form) return;

	atStart.value = false;
	active.value = Some(clicked);

	$gsap.set(container, {
		height: !isMobile ? "100%" : "",
		width: isMobile ? "100%" : "",
	});

	$gsap.to(card, {
		left: !isMobile ? `calc(-${card.offsetLeft}px + 0.75rem)` : "",
		height: !isMobile ? "calc(100% - 1.5rem)" : "",
		top: isMobile ? `calc(-${card.offsetTop}px + 0.75rem)` : "",
		width: isMobile ? "calc(100% - 1.5rem)" : "",
		...Timing.in,
	});

	$gsap
		.to(other, {
			x: !isMobile ? `-${PreTranslateOffset}rem` : "",
			y: isMobile ? `-${PreTranslateOffset}rem` : "",
			opacity: 0,
			...Timing.in,
		})
		.then(() => {
			$gsap.set(other, {
				x: "-100vw",
			});
		});

	const iconSrc = icon.$el.children[0] as SVGGElement;
	const chevron = isMobile ? ChevronUp : ChevronLeft;

	$gsap.to(iconSrc.children[0] as SVGPathElement, {
		morphSVG: chevron,
		...Timing.fast.in,
	});

	$gsap.to(iconSrc.children[1] as SVGPathElement, {
		morphSVG: chevron,
		...Timing.fast.in,
	});

	$gsap.to(title, {
		text: "Back",
		...Timing.in,
	});

	const x = card.getBoundingClientRect().width / 2;
	const y = card.getBoundingClientRect().height / 3;

	$gsap.set(form, {
		x: !isMobile ? `${x + Convert.remToPx(PreTranslateOffset + 0.75)}px` : "",
		y: isMobile ? `${y + Convert.remToPx(PreTranslateOffset + 0.75)}px` : "",
		opacity: 0,
	});

	$gsap.to(form, {
		x: !isMobile ? `${x + Convert.remToPx(0.75)}px` : "",
		y: isMobile ? `${y + Convert.remToPx(0.75)}px` : "",
		opacity: 1,
		delay: Timing.fast.offset,
		...Timing.in,
	});

	setTimeout(() => {
		atEnd.value = true;
		if (card.matches(":hover")) hover(true, true);
	}, Timing.in.duration * 1000);
}

function hover(enter: boolean, force?: boolean) {
	const card = activeRef()?.value?.card;
	const form = activeForm()?.value;

	if (!card || !form || mobile.value) return;
	if ((!atEnd.value || hovered.value === enter) && !force) return;
	hovered.value = enter;

	const bbox = card.getBoundingClientRect();
	const width = bbox.right - bbox.left;
	const tl = $gsap.timeline();
	const isStudent = active.value.unwrap("student") === "student";

	tl.to(card, {
		width: `calc(${width}px ${enter ? "+" : "-"} 4rem)`,
		left: isStudent
			? `${card.style.left.slice(0, card.style.left.length - 1)} ${enter ? "+" : "-"} 4rem)`
			: `${card.style.left.slice(0, card.style.left.length - 1)}`,
		...(enter ? Timing.in : Timing.out),
	});

	tl.to(
		form,
		{
			x: `${(bbox.width + Convert.remToPx(4) * (+enter * 2 - 1)) / 2 + Convert.remToPx(0.75)}px`,
			...(enter ? Timing.in : Timing.out),
		},
		Timing.offset,
	);
}

function adminSubmit() {
	atEnd.value = false;
	transition.out.trigger().then(() => router.push("/admin"));
}

async function studentSubmit(id: string) {
    auth.setType("student");

	atEnd.value = false;

	// check to make sure the student exists
	const exists = await ApiClient.fetch("student/exists", {
		params: { id: Crypt.sha256(id) },
	});

	if (exists.isErr()) {
		apiToast(exists.error, router.push);
        auth.setType("error");
		return;
	}

	if (!exists.value) {
		// student doesn't exist
		toast.warning(
			"You don't have any hours logged. Come back when you get some hours!",
		);
		auth.clear();
		return;
	}

	auth.setStudent(id);
	transition.out.trigger().then(() => router.push("/student"));
}

onMounted(() => {
	window?.addEventListener("resize", () => {
		if (!mobile.value) backClick();
	});

	$gsap.set([studentForm.value, adminForm.value], {
		x: "-100vw",
	});

	if (params.error === "session-expired") {
		toast.error("Session expired. Please log in again.");
		delete params.error;
	}
});
</script>

<template>
	<RequireStorage ref="storage" :actions="narrow([Actions.TokenFound, Actions.StudentIdFound])">
		<FocusCards ref="cards" :animate="atStart" :length="2" show-text>
			<FocusCard
				ref="student"
				@click="() => click('student')"
				@mouseenter="() => hover(true)"
				@mouseleave="() => hover(false)"
				title="Student"
				icon="hugeicons:mortarboard-01"
				:customize="Customize.Duplicate()"
			/>

			<FocusCard
				ref="admin"
				@click="() => click('admin')"
				@mouseenter="() => hover(true)"
				@mouseleave="() => hover(false)"
				title="Admin"
				icon="hugeicons:user-lock-01"
				:customize="Customize.Duplicate()"
			/>
		</FocusCards>
		<div class="absolute w-full">
			<div class="form" ref="adminForm">
				<div class="textbox">
					<Icon name="hugeicons:user-lock-01" size="64" :customize="Customize.StrokeWidth(0.5)" mode="svg" />
					Admin Password
				</div>
				<div />
				<SizeDependent ref="adminFormRender">
					<FormPassword class="form password" :size="screenSize <= 1 ? 'md' : 'lg'" @submit="adminSubmit" />
				</SizeDependent>
				<div />
			</div>
			<div class="form" ref="studentForm">
				<div class="textbox">
					<Icon name="hugeicons:mortarboard-01" size="64" :customize="Customize.StrokeWidth(0.5)" mode="svg" />
					Student ID
				</div>
				<div />
				<FormStudentId class="form studentid" size="lg" @submit="studentSubmit" />
				<div />
			</div>
		</div>
	</RequireStorage>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.form {
	@apply absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%];
	@apply opacity-0;
	@apply bg-drop max-md:w-[calc(100%-1.5rem)] md:w-[28rem] lg:w-[36rem] xl:w-[48rem] 2xl:w-[64rem] h-[32rem] rounded-xl shadow-xl;
	@apply flex flex-col justify-between items-center;
}

.textbox {
	@apply absolute flex items-center gap-6;
	@apply mt-8;
	@apply text-xl select-none;
}
</style>
