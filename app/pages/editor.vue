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
import cuid from "cuid";
import type { Reactive } from "vue";
import "~/style/tailwind.css";

const { $gsap } = useNuxtApp();
const token = useToken();
const password = usePassword();

interface Cell {
	date: Temporal.PlainDate;
	entries: Reactive<Map<string, Ref<TimeEntry>>>;
}

interface Student {
	id: string;
	first: string;
	last: string;
	hashed: string;
	cells: Cell[];
}

// organized by hashed student id, not real id
const tableData: Reactive<Map<string, Student>> = reactive(new Map());
const updates: Ref<UpdateQuery[]> = ref([]);
const undoStack: UpdateQuery[] = [];

const studentData = new JsonDb(StudentData, []);
const ready = ref(false);

const websocket = makeWebsocket({
	messages: {
		EditorData: (_, q) => {
			if (q.type === "Full") {
				q.data.entries().forEach(([hashed, row]) => {
					const cells = row.cells.map((c) => ({
						date: c.date,
						entries: reactive(
							new Map(
								c.entries.entries().map(([id, entry]) => [id, ref(entry)]),
							),
						),
					}));

					const student = studentData
						.all()
						.find((s) => Crypt.sha256(s.id) === hashed)!;

					tableData.set(hashed, {
						...student,
						hashed,
						cells,
					});
				});

				setTimeout(() => { ready.value = true }, 500);
			} else if (q.type === "Create") {
				tableData
					.get(q.studentId)
					?.cells.find((c) => c.date.equals(q.date))
					?.entries.set(q.entry.id, ref(q.entry));
			} else if (q.type === "Update") {
				const ref = tableData
					.get(q.studentId)
					?.cells.find((c) => c.date.equals(q.date))
					?.entries.get(q.id);

				const entry = ref?.value;

				if (!entry) return;

				for (const update of q.updates) {
					const up = narrow(update);
					(entry[up.type] as unknown) = update.data;
				}

				ref.value = { ...entry };
			} else if (q.type === "Delete") {
				tableData
					.get(q.studentId)
					?.cells.find((c) => c.date.equals(q.date))
					?.entries.delete(q.id);
			}
		},
		StudentData: (_, data) => {
			if (!data) {
				studentData.reset([]);
				return;
			}

			Crypt.decrypt(data, password.value!)
				.then((decrypted) => {
					studentData.reset(JSON.parse(decrypted));

					for (const student of studentData.all()) {
						const hashed = Crypt.sha256(student.id);
						if (!tableData.has(hashed)) {
							tableData.set(hashed, {
								...student,
								hashed,
								cells: [],
							});
						}
					}
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

function dateFmt(date: Temporal.PlainDate) {
	const now = Temporal.Now.plainDateISO();

	if (now.year != date.year)
		return `${date.toLocaleString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;

	if (now.weekOfYear != date.weekOfYear)
		return `${date.toLocaleString(undefined, { month: "long", day: "numeric" })}`;

	if (now.day === date.day)
		return `Today (${date.day}-${date.month}-${date.year})`;
	if (now.day - 1 === date.day)
		return `Yesterday (${date.day}-${date.month}-${date.year})`;

	return `This ${date.toLocaleString(undefined, { weekday: "long" })}`;
}

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

// functionality
const scrollX = ref(0);
const scrollY = ref(0);
const table = ref<HTMLCanvasElement>();

watch([ready, table, () => tableData.size], ([isReady, canvas, _]) => {
	/*
	 * self-doc for handling borders:
	 * any element with a border (e.g.) to the right will place the
	 * border inside itself, and the element to the right will not
	 * be offset. borders between two touching elements will be assigned
	 * to the top/left element, so boxes should have a border on the
	 * bottom/right but not top/left
	 *
	 * thank you for listening to my ted talk
	 */

	const Colors = {
		drop: "#171717",
		backgroundDark: "#1f1f1f",
		background: "#242424",
		card: "#303030",
		cardHover: "#3d3d3d",
		cardActive: "#282828",
		card2: "#565656",
		card2Hover: "#636363",
		card2Active: "#494949",
	}

	const PAD_X = Convert.remToPx(1); // px-4 py-2 equivalent
	const PAD_Y = Convert.remToPx(0.5);
	const ROW_HEIGHT = 52; // from before, tbd

	console.log("causing" , ready.value, table.value, tableData.size);

	if (!isReady || !canvas) return;
	const ctx = canvas.getContext("2d")!;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	/*
	 * canvas units aren't the same as pixels for some reason
	 * so we have to do this fun dance to make it look good
	 */
	const dpr = window.devicePixelRatio || 1;
	const rect = canvas.getBoundingClientRect();
	canvas.width = rect.width * dpr;
	canvas.height = rect.height * dpr;
	ctx.scale(dpr, dpr);

	/*
	 * set the font correctly, we are going to be
	 * measuring text sizes. 1.125rem = lg = header
	 */
	ctx.font = "1.125rem 'JetBrains Mono', monospace";

	/*
	 * student info header is always fixed-in-place
	 * i do want to find the longest first, last name however
	 * to size the column properly. comparing the size of the text
	 * rather than the length of the string
	 */
	const firstWidth = Math.max(
		...Array.from(tableData.values()).map(
			(s) => ctx.measureText(s.first).width,
		),
		ctx.measureText("First Name").width
	);
	const lastWidth = Math.max(
		...Array.from(tableData.values()).map((s) => ctx.measureText(s.last).width),
		ctx.measureText("Last Name").width
	);
	const idWidth = ctx.measureText("Student ID").width;

	console.log(idWidth, firstWidth, lastWidth);

	// name header is 100% will never move
	let cumWidth = new Accumulate();

	function setText() {
		ctx.fillStyle = "#fff";
	}

	function setRect(fill: string, stroke: string) {
		ctx.fillStyle = fill;
		ctx.strokeStyle = stroke;
	}

	ctx.beginPath();
	setRect(Colors.card, Colors.card2Hover);
	ctx.rect(0, 0, cumWidth.add(idWidth + 2 * PAD_X), ROW_HEIGHT);
	ctx.fill();
	ctx.stroke();

	ctx.beginPath();
	setText();
	ctx.fillText("Student ID", PAD_X, ROW_HEIGHT / 2);

	setRect(Colors.card, Colors.card2Hover);
	ctx.rect(cumWidth.value, 0, cumWidth.add(firstWidth + 2 * PAD_X), ROW_HEIGHT);
	ctx.fill();
	ctx.stroke();

	ctx.rect(cumWidth.value, 0, cumWidth.add(lastWidth + 2 * PAD_X), ROW_HEIGHT);
	ctx.fill();
	ctx.stroke();


	// name section is always fixed-in-place so can render independent of scrollX

	watch([scrollY], ([y]) => {});

	watch([scrollX, scrollY], ([x, y]) => {});
});

onMounted(async () => {
	if (!token.value) {
		return;
	}

	const font = new FontFace(
		"JetBrains Mono",
		"url('https://raw.githubusercontent.com/JetBrains/JetBrainsMono/refs/heads/master/fonts/webfonts/JetBrainsMono-Regular.woff2') format('woff2')",
		{ style: "normal", weight: "400" },
	);

	await font.load();
	document.fonts.add(font);

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
	<div class="page" v-if="ready">
		<div class="utilities">
			<Button kind="card" class="button exit">
				<Icon name="hugeicons:logout-02" size="22" />
				Exit
			</Button>

			<Button kind="card" class="button" disabled>
				<Icon name="hugeicons:download-01" size="22" />
				Download
			</Button>

			<Button :disabled="updates.length === 0" kind="card" class="button">
				<Icon name="hugeicons:undo" size="22" />
				Undo
			</Button>

			<Button :disabled="undoStack.length === 0" kind="card" class="button">
				<Icon name="hugeicons:redo" size="22" />
				Redo
			</Button>

			<Button v-if="updates.length > 0" kind="error" class="button">
				<Icon name="hugeicons:trash-01" size="22" />
				Discard {{ Math2.format(updates.length, "Change") }}
			</Button>

			<Button v-if="updates.length > 0" kind="card" class="button">
				<Icon name="hugeicons:upload-01" size="22" />
				Push {{ Math2.format(updates.length, "Change") }}
			</Button>
		</div>

		<div class="table-container">
			<canvas ref="table" class="table" />
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

.table-container {
	@apply flex flex-row px-2 pb-2;
	@apply flex-1 min-h-0;

	.table {
		@apply w-full h-full;
	}
}

.utilities {
	@apply flex flex-row items-center;
	@apply w-full p-2 gap-2;

	.button {
		@apply flex flex-row items-center gap-2;

		&.exit {
			@apply text-red-500;
		}
	}
}

.loading {
	@apply flex justify-center items-center;
	@apply w-full h-full;

	@apply text-4xl font-semibold text-center;
}
</style>

<style>
@reference '~/style/tailwind.css';

#content {
	@apply overflow-y-scroll overscroll-none;
}
</style>
