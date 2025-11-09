<script setup lang="ts">
import type { FocusCard, FocusCards } from "#components";
import type { WatchHandle } from "vue";
import { toast } from "vue-sonner";
import type { PasswordSubmitEvent } from "~/components/forms/Password.vue";
import type { IdSubmitEvent } from "~/components/forms/StudentId.vue";
import { ApiClient, apiToast } from "~/utils/api";

const { $gsap } = useNuxtApp();

interface Context {
    card: Ref<InstanceType<typeof FocusCard> | undefined>;
    form: Ref<HTMLDivElement | undefined>;
    hovered: Ref<boolean>;
    presize: [number, number];
    preposition: [number, number];
    watcher?: WatchHandle;
}

interface Active {
    current: Ref<Option<"student" | "admin">>;
    ref: ComputedRef<Option<Context>>;
    antiref: ComputedRef<Option<Context>>;
    fetch: (previous: "student" | "admin") => Context;
    antifetch: (current: "student" | "admin") => Context;
}

const student_card = ref<InstanceType<typeof FocusCard>>();
const student_form = ref<HTMLDivElement>();
const student_loading = ref<boolean>(false);
const admin_card = ref<InstanceType<typeof FocusCard>>();
const admin_form = ref<HTMLDivElement>();

const student: Context = {
    card: student_card,
    form: student_form,
    hovered: ref<boolean>(false),
    presize: [0, 0],
    preposition: [0, 0],
};

const admin: Context = {
    card: admin_card,
    form: admin_form,
    hovered: ref<boolean>(false),
    presize: [0, 0],
    preposition: [0, 0],
};

const active: Active = {
    current: ref<Option<"student" | "admin">>(None),
    ref: computed(() => {
        return active.current.value.map(active.fetch);
    }),
    antiref: computed(() => {
        return active.current.value.map(active.antifetch);
    }),
    fetch: (previous: "student" | "admin") => {
        return previous === "admin" ? admin : student;
    },
    antifetch: (current: "student" | "admin") => {
        return current === "admin" ? student : admin;
    },
};

const Position = {
    edge: Convert.remToPx(1),
    fade: Convert.remToPx(20),
} as const;

const frozen = ref<boolean>(false);
const constrained = computed(() => active.current.value.isSome());

const container = ref<InstanceType<typeof FocusCards>>();

const params = useUrlSearchParams();
const screenSize = useScreenSize();
const isMobile = useMobile(screenSize);

const transition = injectTransition();
const router = useRouter();

const auth = useAuth();

function mix<A, B, C>(base: A, desktop: B, mobile: C): A & (B | C) {
    return isMobile.value ? { ...base, ...mobile } : { ...base, ...desktop };
}

function match<B, C>(desktop: B, mobile: C): B | C {
    return mix({}, desktop, mobile);
}

function back() {
    if (frozen.value) return;
    if (!active.current.value.isSome()) return;

    const wasActive = active.current.value.value;
    const context = active.ref.value.unwrap();
    const card = context.card.value;
    const form = context.form.value;
    const other = active.antiref.value.unwrap().card.value;
    const iconDst = card?.icon?.$el.children[0] as SVGGElement | undefined;
    const iconSrc = card?.icon?.$el.children[1] as SVGGElement | undefined;

    if (
        !card?.prim
        || !card.title
        || !other?.prim
        || !container.value?.prim
        || !form
        || !iconDst
        || !iconSrc
    ) {
        return;
    }

    frozen.value = true;
    active.current.value = None;

    const tl = $gsap.timeline();

    tl.set(
        card.prim,
        mix(
            {
                clearProps: "position,top,left,bottom",
                height: `calc(100% - ${2 * Position.edge}px)`,
            },
            { x: -context.preposition[0] + Position.edge + 3 },
            { y: -context.preposition[1] + Position.edge + 3 },
        ),
    );

    tl.set(other.prim, match({ x: -Position.fade }, { y: -Position.fade }));

    tl.to(
        card.prim,
        mix(
            {
                width: context.presize[0],
                height: context.presize[1],
                clearProps: "all",
                ...Timing.out,
            },
            { x: 0 },
            { y: 0 },
        ),
    );

    tl.to(
        card.title,
        {
            text: wasActive.slice(0, 1).toUpperCase() + wasActive.slice(1),
            ...Timing.out,
        },
        0,
    );

    tl.to(
        iconDst.children[0] as SVGPathElement,
        { morphSVG: iconSrc.children[0] as SVGPathElement, ...Timing.fast.out },
        0,
    );

    tl.to(
        iconDst.children[1] as SVGPathElement,
        { morphSVG: iconSrc.children[1] as SVGPathElement, ...Timing.fast.out },
        0,
    );

    tl.to(
        other.prim,
        mix(
            { opacity: 1, clearProps: "all", ...Timing.out },
            { x: 0 },
            {
                y: 0,
            },
        ),
        0,
    );

    tl.to(
        form,
        mix(
            { opacity: 0, clearProps: "all", ...Timing.out },
            { x: context.presize[0] / 2 + Position.edge + Position.fade },
            { y: context.presize[1] / 2 + Position.edge + Position.fade },
        ),
        0,
    );

    tl.set(container.value.prim, { clearProps: "all" });

    tl.call(() => {
        frozen.value = false;
    });
}

function click(clicked: "student" | "admin") {
    if (frozen.value) return;
    if (active.current.value.isSome()) return back();

    const context = active.fetch(clicked);
    const card = context.card.value;
    const form = context.form.value;
    const icon = card?.icon?.$el.children[0] as SVGGElement | undefined;
    const other = active.antifetch(clicked).card.value;

    if (
        !card?.prim
        || !card.title
        || !other?.prim
        || !container.value?.prim
        || !form
        || !icon
    ) {
        return;
    }
    frozen.value = true;
    active.current.value = Some(clicked);

    const bbox = card.prim.getBoundingClientRect();

    context.presize = [bbox.width, bbox.height];
    context.preposition = [bbox.left, bbox.top];

    const tl = $gsap.timeline();

    tl.set(container.value.prim, match({ height: "100%" }, { width: "100%" }));

    tl.set(
        form,
        mix(
            { opacity: 0, zIndex: 10 },
            { x: bbox.width / 2 + Position.edge + Position.fade },
            {
                y: bbox.height + 2 * Position.edge + Position.fade,
                height: `calc(100% - ${3 * Position.edge + bbox.height}px)`,
                width: `calc(100% - ${2 * Position.edge}px)`,
            },
        ),
    );

    tl.to(
        card.prim,
        mix(
            Timing.in,
            {
                x: -context.preposition[0] + Position.edge + 3,
                height: `calc(100% - ${2 * Position.edge}px)`,
            },
            {
                y: -context.preposition[1] + Position.edge + 3,
                width: `calc(100% - ${2 * Position.edge}px)`,
            },
        ),
    );

    const chevron = isMobile.value ? ChevronUp : ChevronLeft;
    tl.to(
        icon.children[0] as SVGPathElement,
        { morphSVG: chevron, ...Timing.fast.in },
        0,
    );

    tl.to(
        icon.children[1] as SVGPathElement,
        { morphSVG: chevron, ...Timing.fast.in },
        0,
    );

    tl.to(card.title, { text: "Back", ...Timing.in }, 0);

    tl.to(
        other.prim,
        mix(
            { opacity: 0, ...Timing.in },
            { x: -Position.fade },
            { y: -Position.fade },
        ),
        0,
    );

    tl.to(
        form,
        mix(
            { opacity: 1, ...Timing.in },
            { x: bbox.width / 2 + Position.edge },
            { y: 0.5 * (bbox.height + Position.edge) },
        ),
        Timing.offset,
    );

    tl.call(() => {
        const bbox = card.prim!.getBoundingClientRect();

        $gsap.set(
            card.prim!,
            mix(
                {
                    position: "absolute",
                    top: Position.edge,
                    left: Position.edge,
                },
                { height: bbox.height, bottom: Position.edge, clearProps: "x" },
                { width: bbox.width, right: Position.edge, clearProps: "y" },
            ),
        );

        $gsap.set(other.prim!, match({ x: "-100vw" }, { y: "-100vh" }));

        frozen.value = false;
    });
}

async function studentSubmit({ id }: IdSubmitEvent) {
    student_loading.value = true;
    auth.clear();

    const res = await ApiClient.fetch("student/info", {
        params: { id: Crypt.sha256(id) },
    });

    if (res.isErr()) {
        student_loading.value = false;

        apiToast(res.error, {
            handle: {
                [404]: () => {
                    toast.warning(
                        "You haven't signed in before. Try again when you have hours!",
                    );
                },
            },
        });

        return back();
    }

    const studentAuth = auth.student.value;

    if (studentAuth.status === "ok") studentAuth.id.value = id;
    else studentAuth.set(id);

    transition.out.trigger().then(() => router.push("/student"));
}

function adminSubmit(ev: PasswordSubmitEvent) {
    auth.clear();

    const adminAuth = auth.admin.value;

    if (adminAuth.status === "ok") {
        adminAuth.password.value = ev.password;
        adminAuth.token.value = {
            token: ev.token,
            expiry: ev.expires,
        };
    } else {
        adminAuth.set(ev.password, ev.token, ev.expires);
    }

    transition.out.trigger().then(() => router.push("/admin"));
}

const studentClick = () => click("student");
const adminClick = () => click("admin");

watch([active.current, isMobile], ([current, mobile], [old, _]) => {
    if (mobile) return;

    if (!current.isSome()) {
        if (!old.isSome()) return;

        const context = active.fetch(old.value);
        context.watcher?.();
        context.watcher = undefined;
        return;
    }

    const context = active.fetch(current.value);

    context.watcher = watch(
        [context.hovered, context.card, context.form, frozen],
        ([hovered, card, form, frozen]) => {
            if (frozen) return;
            if (!card?.prim || !form) return;

            const offset = hovered ? Convert.remToPx(4) : 0;
            const tl = $gsap.timeline();

            tl.to(card.prim, {
                width: context.presize[0] + offset,
                ...Timing.in,
            });

            tl.to(
                form,
                {
                    x: context.presize[0] / 2 + Position.edge + offset / 2,
                    ...Timing.in,
                },
                Timing.slow.offset,
            );
        },
    );
});

onMounted(() => window.addEventListener("resize", back));
</script>

<template>
    <RequireStorage
        ref="storage"
        :actions="narrow([Actions.TokenFound, Actions.StudentIdFound])"
    >
        <div class="stack">
            <div class="item">
                <FocusCards
                    class="cards"
                    ref="container"
                    :length="2"
                    :animate="!frozen && !constrained"
                    show-text
                >
                    <FocusCard
                        ref="student_card"
                        title="Student"
                        icon="hugeicons:mortarboard-01"
                        @mouseenter="student.hovered.value = true"
                        @mouseleave="student.hovered.value = false"
                        @click="studentClick"
                        :customize="Customize.Duplicate()"
                    />

                    <FocusCard
                        ref="admin_card"
                        title="Admin"
                        icon="hugeicons:user-lock-01"
                        @mouseenter="admin.hovered.value = true"
                        @mouseleave="admin.hovered.value = false"
                        @click="adminClick"
                        :customize="Customize.Duplicate()"
                    />
                </FocusCards>
            </div>

            <div class="item">
                <div class="form" ref="admin_form">
                    <div class="textbox">
                        <Icon
                            name="hugeicons:user-lock-01"
                            size="64"
                            :customize="Customize.StrokeWidth(
                                0.5,
                            )"
                            mode="svg"
                        />
                        Admin Password
                    </div>
                    <div />
                    <SizeDependent ref="adminFormRender">
                        <FormPassword
                            class="form password"
                            :size="([
                                'md',
                                'sm',
                                'md',
                                'lg',
                                'lg',
                            ] as const)[
                                screenSize
                            ]!"
                            @submit="adminSubmit"
                        />
                    </SizeDependent>
                    <div />
                </div>
            </div>

            <div class="item">
                <div class="form" ref="student_form">
                    <div class="textbox">
                        <Icon
                            name="hugeicons:mortarboard-01"
                            size="64"
                            :customize="Customize.StrokeWidth(
                                0.5,
                            )"
                            mode="svg"
                        />
                        Student ID
                    </div>
                    <div />
                    <SizeDependent>
                        <FormStudentId
                            class="form studentid"
                            :loading="student_loading"
                            :size="([
                                'lg',
                                'md',
                                'lg',
                                'lg',
                                'lg',
                            ] as const)[
                                screenSize
                            ]!"
                            @submit="studentSubmit"
                        />
                    </SizeDependent>
                    <div />
                </div>
            </div>
        </div>
    </RequireStorage>
</template>

<style scoped>
@reference "~/style/tailwind.css";

.stack {
    @apply w-full h-full grid;
    @apply grid-cols-1 grid-rows-1;

    .item {
        grid-area: 1/1;
        @apply w-full h-full;
        @apply flex items-center justify-center;
    }
}

.cards {
    @apply max-md:w-full md:h-full;
}

.form {
    @apply bg-drop md:w-[28rem] lg:w-[36rem] xl:w-[48rem] 2xl:w-[64rem]
        h-[32rem] rounded-xl shadow-xl;
    @apply flex flex-col justify-between items-center;
    @apply md:-translate-x-[100vw] max-md:-translate-y-[100vh];
}

.textbox {
    @apply absolute flex items-center gap-6;
    @apply mt-8;
    @apply text-xl select-none;
}
</style>
