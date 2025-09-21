<script setup lang="ts" generic="A extends Actions">
export interface Action {
	name: string;
	storage: "local" | "session";
	when: "missing" | "found";
	redirectTo: string;
}

export type Actions = Array<Action>;

export type SSActions<A extends Actions> = Filter<A, { from: "session" }>;
export type LSActions<A extends Actions> = Filter<A, { from: "local" }>;
export type MissingActions<A extends Actions> = Filter<A, { when: "missing" }>;

export type Data<A extends Actions> = {
	[K in MissingActions<A>[number]["name"]]: string;
};

const router = useRouter();

const props = defineProps<{ actions: Narrow<A> }>();
const emit = defineEmits<{ data: [data: Data<A>] }>();

function localStorage(key: string): string | null {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function sessionStorage(key: string): string | null {
	try {
		return window.sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

onMounted(() => {
	const local = Object.fromEntries(
		props.actions
			.filter((a) => a.storage === "local")
			.map((a) => [a.name, localStorage(a.name)] as const),
	);

	const session = Object.fromEntries(
		props.actions
			.filter((a) => a.storage === "session")
			.map((a) => [a.name, sessionStorage(a.name)] as const),
	);

	const data = (props.actions as Actions).reduce(
		(acc, action) => {
			if (action.when !== "missing") return acc;

			if (action.storage === "local") {
				acc[action.name as keyof Data<A>] = local[action.name]!;
			} else {
				acc[action.name as keyof Data<A>] = session[action.name]!;
			}

			return acc;
		},
		{} as Partial<Data<A>>,
	) as Data<A>;

	for (const action of props.actions as Actions) {
		if (action.storage === "session") {
			if (action.when === "missing" && session[action.name]) continue;
			if (action.when === "found" && !session[action.name]) continue;
		}

		if (action.storage === "local") {
			if (action.when === "missing" && local[action.name]) continue;
			if (action.when === "found" && !local[action.name]) continue;
		}

		router.push(action.redirectTo);
		break;
	}

	emit("data", data);
});
</script>

<template>
    <slot  />
</template>
