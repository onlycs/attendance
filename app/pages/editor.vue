<script setup lang="ts">
import { toast } from "vue-sonner";
import type { Table, TableBody, TableHeader } from "#components";
import { Math2 } from "~/utils/math";
import {
	makeWebsocket,
	type Row,
	type TimeEntry,
	type UpdateQuery,
} from "~/utils/zodws/api";
import { Temporal } from "temporal-polyfill";

const { $gsap } = useNuxtApp();
const token = useToken();
const password = usePassword();

const editorData = ref<Map<string, Row>>(new Map());
const studentData = ref(new JsonDb(StudentData, []));
const ready = computed<boolean>((old) => {
	return (
		(editorData.value.size > 0 && studentData.value.length() > 0) ||
		(old ?? false)
	);
});

const updates: Ref<UpdateQuery[]> = ref([]);
const websocket = makeWebsocket({
	messages: {
		EditorData: (_, q) => {
			if (q.type === "Full") {
				editorData.value = q.data;
			} else if (q.type === "Create") {
				editorData.value
					.get(q.studentId)
					?.cells.find((c) => c.date.getTime() === q.date.getTime())
					?.entries.set(q.entry.id, q.entry);
			} else if (q.type === "Update") {
				const entry = editorData.value
					.get(q.studentId)
					?.cells.find((c) => c.date.getTime() === q.date.getTime())
					?.entries.get(q.id);

				if (!entry) return;

				for (const update of q.updates) {
					const up = narrow(update);
					(entry[up.type] as unknown) = update.data;
				}
			} else if (q.type === "Delete") {
				editorData.value
					.get(q.studentId)
					?.cells.find((c) => c.date.getTime() === q.date.getTime())
					?.entries.delete(q.id);
			}
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

function onReady(f: () => void) {
	if (ready.value) {
		f();
	} else {
		const stop = watch(ready, (newVal) => {
			if (newVal) {
				stop();
				f();
			}
		});
	}
}

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
const contentHeader = ref<InstanceType<typeof TableHeader>>();
const contentData = ref<InstanceType<typeof TableBody>>();

const fadeReposition = useThrottleFn(() => {
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

	const pageBox = pageEl.getBoundingClientRect();
	const infoHeaderBox = infoHeaderEl.getBoundingClientRect();
	const infoDataBox = infoDataEl.getBoundingClientRect();

	const contentBox = contentEl.getBoundingClientRect();
	const contentDataBox = contentDataEl.getBoundingClientRect();

	const top = contentDataEl.scrollTop;
	const bottom = contentDataEl.scrollHeight - contentDataBox.height - top;
	const left = contentEl.scrollLeft;
	const right = contentEl.scrollWidth - contentBox.width - left;

	const padding = infoHeaderBox.left;

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
}, 32);

function infoScroll(ev: WheelEvent) {
	contentData.value!.$el.scrollTop += ev.deltaY;
}

function contentScrollY(ev: WheelEvent) {
	infoData.value!.$el.scrollTop += ev.deltaY;
}

function contentScrollX(ev: WheelEvent) {
	content.value!.$el.scrollLeft += ev.deltaX;
}

onMounted(() => {
	window.addEventListener("resize", fadeReposition);
});

onReady(() => {
	fadeReposition();
});

watchEffect(() => {
	if (!contentData.value || !infoData.value) return;

	// sync table row heights
	const contentCell = contentData.value.$el.querySelector("td")!;
	const infoCells = infoData.value.$el.querySelectorAll("td");
	const contentCellBox = contentCell.getBoundingClientRect();

	for (const cell of infoCells) {
		cell.style.height = `${contentCellBox.height}px`;
	}
});

// labelling
function hours(el: number): string {
	const mins = el * 60;

	if (mins < 15) return Math2.format(mins, "Minute");
	else return Math2.format(el, "Hour", 2);
}

function entriesLabel(entries: TimeEntry[]) {
	if (entries.length === 0) return "No data";

	let sum = new Temporal.Duration();

	for (const entry of entries) {
		if (!entry.end) continue;
		sum = sum.add(entry.start.until(entry.end));
	}

	return hours(sum.total({ unit: "hours" }));
}

function entryLabel(entry: TimeEntry) {
	if (!entry.end) return "Ongoing";
	return hours(entry.start.until(entry.end).total({ unit: "hours" }));
}

function icon(count: number) {
	if (count === 0) return "hugeicons:add-01";
	return "hugeicons:arrow-down-01";
}

// sorted student data
const fullData = computed(() => {
	const sorted = studentData.value.get({}).sort((a, b) => {
		if (a.last === b.last) {
			return a.first.localeCompare(b.first);
		}
		return a.last.localeCompare(b.last);
	});

	const data = sorted.map((data) => ({
		...data,
		hashed: Crypt.sha256(data.id),
		dates: editorData.value.get(Crypt.sha256(data.id))?.cells ?? [],
	}));

	for (const update of updates.value) {
		if (update.type === "Create") {
			const student = data.find(d => d.hashed === update.studentId)!;
			const date = student.dates.find(d => d.date === update.signIn)
		}
	}
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

			<Button v-if="updates.length > 0" kind="card" class="button">
				<Icon name="hugeicons:upload-01" size="22" />
				Push {{ Math2.format(updates.length, "Change") }}
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
				<TableBody class="body" ref="infoData" @wheel="infoScroll">
					<DataRow v-for="student in fullData" :key="student.id">
						<DataCell>{{ student.id }}</DataCell>
						<DataCell>{{ student.first }}</DataCell>
						<DataCell>{{ student.last }}</DataCell>
					</DataRow>
				</TableBody>
			</Table>

			<Table class="data" ref="content" @scroll="fadeReposition" @wheel="contentScrollX">
				<TableHeader class="header" ref="contentHeader">
					<HeaderCell 
						v-for="date in [...editorData.entries()][0]![1].cells.map(d => d.date)" 
						:key="date.toISOString()"
						class="date"
					>
						{{ dateFmt(date) }}
					</HeaderCell>
				</TableHeader>
				<TableBody class="body" ref="contentData" @wheel="contentScrollY" @scroll="fadeReposition">
					<DataRow 
						v-for="student in fullData" 
						:key="student.id"
					>
						<DataCell v-for="day in student.dates" :key="`${student.id}${day.date.toLocaleString()}`">
							<Popover 
								:trigger="{ 
									label: entriesLabel(Array.from(day.entries.values())), 
									icon: icon(day.entries.size) 
								}" 
								class="dateinfo"
							>
								<div class="entry" v-for="[id, entry] in day.entries" :key="id">
									<div class="header">
										{{ entryLabel(entry) }}
									</div>

									<div class="body">
										<div class="label">Hour Type</div>
										<Select 
											:options="{
												'learning': 'Learning',
												'build': 'Build',
												'demo': 'Volunteer',
											}" 
											:selected="entry.kind"
											@update:selected="console.log"
										/>

										<div class="label">Start Time</div>
										<TimePickerModelSubmit
											:time="entry.start"
											@update:time="(data) => {
												console.log(data);
												updates.push({
													type:'Update',
													id: entry.id,
													updates: [{
														type: 'start',
														data,
													}]
												})
											}"
										/>

										<div class="label">End Time</div>
										<TimePicker
											:time="entry.end"
											@update:time="console.log"
										/>
									</div>
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
	@apply bg-drop rounded-xl;

	.entry {
		@apply flex flex-col;
		@apply bg-background rounded-xl;
		@apply !p-0;

		.header {
			@apply rounded-lg bg-card p-2;
		}

		.body {
			@apply p-2;

			.label {
				@apply border-b border-b-sub;
				@apply my-2;
			}
		}
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
