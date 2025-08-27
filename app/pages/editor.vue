<script setup lang="ts">
import { toast } from "vue-sonner";
import { z } from "zod";
import type { Table, TableBody, TableHeader } from "#components";
import { EditorDataSchema, makeWebsocket } from "~/utils/zodws/api";

const { $gsap } = useNuxtApp();
const token = useToken();
const password = usePassword();

const editorData = ref<z.infer<typeof EditorDataSchema>>(new Map());
const studentData = ref(new JsonDb(StudentData, []));
const ready = computed<boolean>((old) => {
	return (
		(editorData.value.size > 0 && studentData.value.length() > 0) ||
		(old ?? false)
	);
});

const websocket = makeWebsocket({
	messages: {
		EditorData: (_, data) => {
			editorData.value = data;

			console.log(data);
		},
		StudentData: (_, data) => {
			if (!data) {
				studentData.value.reset([]);
				return;
			}

			Crypt.decrypt(data, password.value!)
				.then((decrypted) => {
					studentData.value.reset(JSON.parse(decrypted));
				})
				.catch((error) => {
					console.error("Failed to decrypt student data:", error);
					toast.error("Failed to load student data. Please try again.");
				});
		},
		Error: (_, data) => {
			toast.error(data.message);
		},
	},
});

function week(date: Date) {
	const d = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);
	const dayNum = d.getUTCDay() || 7; // Monday = 1, Sunday = 7
	d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of current week
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function dateFmt(date: Date) {
	const now = new Date();

	if (now.getFullYear() === date.getFullYear()) {
		if (week(now) === week(date)) {
			if (now.getDate() === date.getDate()) {
				return "Today";
			} else if (now.getDate() - 1 === date.getDate()) {
				return "Yesterday";
			} else {
				return `This ${date.toLocaleDateString(undefined, { weekday: "long" })}`;
			}
		} else {
			return `${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
		}
	} else {
		return `${date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;
	}
}

// table sync and scroll management
const page = ref<HTMLDivElement>();

const infoHeader = ref<InstanceType<typeof TableHeader>>();
const infoData = ref<InstanceType<typeof TableBody>>();

const content = ref<InstanceType<typeof Table>>();
const contentData = ref<InstanceType<typeof TableBody>>();

watchEffect(() => {
	if (
		!ready.value ||
		!page.value ||
		!infoHeader.value ||
		!infoData.value ||
		!content.value ||
		!contentData.value
	)
		return;

	const pageEl = page.value;

	const infoHeaderEl = infoHeader.value.$el as HTMLDivElement;
	const infoDataEl = infoData.value.$el as HTMLDivElement;

	const contentEl = content.value.$el as HTMLDivElement;
	const contentDataEl = contentData.value.$el as HTMLDivElement;

	// scroll sync
	contentDataEl.addEventListener("wheel", (event) => {
		contentEl.scrollLeft += event.deltaX;
		infoDataEl.scrollTop += event.deltaY;
	});

	infoDataEl.addEventListener("wheel", (event) => {
		contentDataEl.scrollTop += event.deltaY;
	});

	// cell height sync
	const contentCell = contentDataEl.querySelector("td")!;
	const infoCells = infoDataEl.querySelectorAll("td");
	const contentCellBox = contentCell.getBoundingClientRect();

	for (const cell of infoCells) {
		cell.style.height = `${contentCellBox.height}px`;
	}

	// shadows
	const recalculate = () => {
		const pageBox = pageEl.getBoundingClientRect();
		const infoHeaderBox = infoHeaderEl.getBoundingClientRect();
		const infoDataBox = infoDataEl.getBoundingClientRect();

		const contentBox = contentEl.getBoundingClientRect();
		const contentDataBox = contentDataEl.getBoundingClientRect();

		const top = contentDataEl.scrollTop;
		const bottom = contentDataEl.scrollHeight - contentDataBox.height - top;
		const left = contentEl.scrollLeft;
		const right = contentEl.scrollWidth - contentBox.width - left;

		const padding = infoHeaderBox.left; // trust

		$gsap.set(".hideaway.top", {
			opacity: top / 64,
			top: infoHeaderBox.bottom,
			left: padding,
			right: padding,
		});

		$gsap.set(".hideaway.bottom", {
			opacity: bottom / 64,
			bottom: window.innerHeight - pageBox.bottom + padding - 1,
			left: padding,
			right: padding,
		});

		$gsap.set(".hideaway.left", {
			opacity: left / 64,
			top: infoHeaderBox.top,
			bottom: window.innerHeight - pageBox.bottom + padding - 1,
			left: infoDataBox.right,
		});

		$gsap.set(".hideaway.right", {
			opacity: right / 64,
			top: infoHeaderBox.top,
			bottom: window.innerHeight - pageBox.bottom + padding,
			right: padding,
		});
	};

	contentDataEl.addEventListener("scroll", recalculate);
	contentEl.addEventListener("scroll", recalculate);
	window.addEventListener("resize", recalculate);

	// onload
	recalculate();
});

// num entry label
function entries(count: number) {
	if (count === 0) return "No Entries";
	if (count === 1) return "1 Entry";
	return `${count} Entries`;
}

function icon(count: number) {
	if (count === 0) return "hugeicons:add-01";
	return "hugeicons:arrow-down-01";
}

// sorted student data
const studentDataSorted = computed(() => {
	return studentData.value.get({}).sort((a, b) => {
		if (a.last === b.last) {
			return a.first.localeCompare(b.first);
		}
		return a.last.localeCompare(b.last);
	});
});

onMounted(() => {
	if (!token.value) {
		return;
	}

	websocket.send("Subscribe", {
		sub: "Editor",
		token: token.value!,
	});

	websocket.send("Subscribe", {
		sub: "StudentData",
		token: token.value!,
	});
});

definePageMeta({ layout: "admin-protected" });
</script>

<template>
	<div class="page" v-if="ready" ref="page">
		<div class="utilities">
			<Button kind="card" class="button exit">
				<Icon name="hugeicons:logout-02" size="22" />
				Exit
			</Button>

			<Button kind="card" class="button">
				<Icon name="hugeicons:download-01" size="22" />
				Download
			</Button>

			<Button kind="card" class="button">
				<Icon name="hugeicons:undo" size="22" />
				Undo
			</Button>

			<Button kind="card" class="button">
				<Icon name="hugeicons:redo" size="22" />
				Redo
			</Button>
		</div>
		<div class="tables">
			<Table class="info">
				<TableHeader class="header" ref="infoHeader">
					<HeaderCell>
						Student ID
					</HeaderCell>
					<HeaderCell>
						First Name
					</HeaderCell>
					<HeaderCell>
						Last Name
					</HeaderCell>
				</TableHeader>
				<TableBody class="body" ref="infoData">
					<DataRow v-for="student in studentDataSorted" :key="student.id">
						<DataCell>{{ student.id }}</DataCell>
						<DataCell>{{ student.first }}</DataCell>
						<DataCell>{{ student.last }}</DataCell>
					</DataRow>
				</TableBody>
			</Table>

			<Table class="data" ref="content">
				<TableHeader class="header">
					<HeaderCell 
						v-for="date in [...editorData.entries()][0]![1].dates.map(d => d.date)" 
						:key="date.toISOString()"
						class="date"
					>
						{{ dateFmt(date) }}
					</HeaderCell>
				</TableHeader>
				<TableBody class="body" ref="contentData">
					<DataRow 
						v-for="[id, dates] in studentDataSorted.map((student) => {
							return [
								student.id,
								editorData.get(Crypt.sha256(student.id))?.dates ??
									editorData.values().next().value!.dates,
							] as const;
						})" 
						:key="id"
					>
						<DataCell v-for="day in dates" :key="`${id}${day.date.toLocaleString()}`">
							<Popover 
								:trigger="{ 
									label: entries(day.entries.length), 
									icon: icon(day.entries.length) 
								}" 
								class="dateinfo"
							>
								<div class="entry" v-for="entry in day.entries" :key="entry.id">
									{{ entry.start.toLocaleDateString() }} - {{ entry.end?.toLocaleDateString() }}
								</div>
							</Popover>
						</DataCell>
					</DataRow>
				</TableBody>
			</Table>
		</div>
		<div class="hideaway left vertical" />
		<div class="hideaway right vertical end" />
		<div class="hideaway top horizontal" />
		<div class="hideaway bottom horizontal end" />
	</div>

	<div v-else class="loading">
		Loading editor
		<br />
		This may take a while...
	</div>
</template>

<style scoped>
@reference '~/style/tailwind.css';

.hideaway {
	@apply absolute;
	@apply to-transparent;

	/* setup gradient directions */
	&.left {
		@apply bg-gradient-to-r;
	}

	&.right {
		@apply bg-gradient-to-l;
	}

	&.top {
		@apply bg-gradient-to-b;
	}

	&.bottom {
		@apply bg-gradient-to-t;
	}

	/* setup sizing */
	&.vertical {
		@apply w-4;
	}

	&.horizontal {
		@apply h-4;
	}

	/* make an actual shadow if ducking under other elements */
	&:not(.end) {
		@apply from-black/35;
	}

	/* otherwise just fade out */
	&.end {
		@apply from-background;
	}
}

.page {
	@apply flex flex-col;
	@apply w-full h-full;
}

.tables {
	@apply flex flex-row px-2 pb-2;
	@apply flex-1 min-h-0;

	@apply overflow-scroll overscroll-none;

	scrollbar-width: none;
}

.container-fixed {
	@apply flex-none;
}

.utilities {
	@apply flex flex-row items-center;
	@apply w-full p-2 gap-2;
}

.button {
	@apply flex flex-row items-center gap-2;

	&.exit {
		@apply text-red-500;
	}
}

.loading {
	@apply flex justify-center items-center;
	@apply w-full h-full;

	@apply text-4xl font-semibold text-center;
}

:deep(.dateinfo) {
	@apply flex flex-col gap-2 p-2;
	@apply bg-card rounded-xl;

	.entry {
		@apply bg-card-2 p-2 rounded-xl;
	}
}
</style>

<style>
@reference '~/style/tailwind.css';

.info {
	.header table, .body table {
		@apply !rounded-r-none;
		@apply !border-r-4 !border-r-card-2;
	}

	th {
		@apply !bg-card-hover;
	}

	tr:nth-child(odd) td {
		@apply !bg-card-active;
	}

	tr:nth-child(even) td {
		@apply !bg-card;
	}
}

.data {
	@apply flex-1;
	@apply overflow-x-scroll overscroll-none;

	scrollbar-width: none;

	.header table, .body table {
		@apply !rounded-l-none;
		@apply !border-l-0;
	}

	th {
		@apply !bg-card;
	}

	tr:nth-child(even) td {
		@apply !bg-card-active;
	}

	tr:nth-child(odd) td {
		@apply !bg-background-dark;
	}

	td > div {
		@apply !p-2;
	}
}

#content {
	@apply overflow-y-scroll overscroll-none;
}
</style>
