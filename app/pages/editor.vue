<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import type { Reactive, WatchHandle } from "vue";
import { toast } from "vue-sonner";
import { Math2 } from "~/utils/math";
import {
	makeWebsocket,
	type TimeEntry,
	type UpdateQuery,
} from "~/utils/zodws/api";
import "~/style/tailwind.css";
import { Accumulate, Draw, PBLookup } from "#imports";

const { $gsap } = useNuxtApp();
const token = useToken();
const password = usePassword();

interface Cell {
	date: Temporal.PlainDate;
	entries: Reactive<Ref<TimeEntry>[]>;
}

interface Student {
	id: string;
	first: string;
	last: string;
	hashed: string;
	cells: Cell[];
}

// organized by hashed student id, not real id
const tableData: Reactive<Student[]> = reactive([]);
const updates: Ref<UpdateQuery[]> = ref([]);
const undoStack: UpdateQuery[] = [];

const studentData = new JsonDb(StudentData, []);
const ready = ref(false);

function sortData() {
	tableData.sort((a, b) => {
		if (a.last.toLowerCase() === b.last.toLowerCase()) {
			return a.first.toLowerCase().localeCompare(b.first.toLowerCase());
		}
		return a.last.toLowerCase().localeCompare(b.last.toLowerCase());
	});
}

const websocket = makeWebsocket({
	messages: {
		EditorData: (_, q) => {
			if (q.type === "Full") {
				tableData.splice(
					0,
					tableData.length,
					...q.data
						.entries()
						.map(([hashed, row]) => {
							const cells = row.cells.map((c) => ({
								date: c.date,
								entries: reactive(
									Array.from(
										c.entries.entries().map(([_, entry]) => ref(entry)),
									),
								),
							}));

							const student = studentData
								.all()
								.find((s) => Crypt.sha256(s.id) === hashed);

							if (!student) return null;

							return {
								...student,
								hashed,
								cells,
							};
						})
						.filter((s): s is Student => !!s),
				);

				sortData();

				setTimeout(() => {
					ready.value = true;
				}, 500);
			} else if (q.type === "Create") {
				tableData
					.find((s) => s.hashed === q.studentId)
					?.cells.find((c) => c.date.equals(q.date))
					?.entries.push(ref(q.entry));
			} else if (q.type === "Update") {
				const ref = tableData
					.find((s) => s.hashed === q.studentId)
					?.cells.find((c) => c.date.equals(q.date))
					?.entries.find((e) => e.value.id === q.id);

				const entry = ref?.value;

				if (!entry) return;

				for (const update of q.updates) {
					const up = narrow(update);
					(entry[up.type] as unknown) = update.data;
				}

				ref.value = { ...entry };
			} else if (q.type === "Delete") {
				const entries = tableData
					.find((s) => s.hashed === q.studentId)
					?.cells.find((c) => c.date.equals(q.date))?.entries;

				if (!entries) return;

				const index = entries.findIndex((el) => el.value.id === q.id);

				if (index === -1) return;

				entries.splice(index, 1);
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

					if (ready.value) {
						let inserted = false;
						for (const student of studentData.all()) {
							const hashed = Crypt.sha256(student.id);
							if (!tableData.find((s) => s.hashed === hashed)) {
								inserted = true;
								tableData.push({
									...student,
									hashed,
									cells: [],
								});
							}
						}

						if (inserted) sortData();
					} else {
						websocket.send("Subscribe", {
							sub: "Editor",
							token: token.value!,
						});
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

	if (now.year !== date.year)
		return `${date.toLocaleString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;

	if (now.weekOfYear !== date.weekOfYear)
		return `${date.toLocaleString(undefined, { month: "long", day: "numeric" })}`;

	if (now.day === date.day)
		return `Today (${date.toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" })})`;
	if (now.day - 1 === date.day)
		return `Yesterday (${date.toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" })})`;

	return `${date.toLocaleString(undefined, { weekday: "long" })} (${date.toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" })})`;
}

// labelling
function hours(el: number): string {
	const mins = el * 60;

	if (mins < 15) return Math2.format(mins, "Minute");
	else return Math2.format(el, "Hour", 2);
}

function entriesLabel(entries: Ref<TimeEntry>[]) {
	if (entries.length === 0) return "No data";

	let sum = new Temporal.Duration();

	for (const entry of entries) {
		if (!entry.value.end) continue;
		sum = sum.add(entry.value.start.until(entry.value.end));
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
const Pad = {
	md: Convert.remToPx(1),
	xs: Convert.remToPx(0.5),
	sm: Convert.remToPx(0.95),
};

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 48;

const scrollX = ref(0);
const scrollY = ref(0);
const table = ref<HTMLCanvasElement>();

const xyWatch = ref<WatchHandle | null>(null);
const resize = ref(false);

const lookup = new PBLookup<{ studentId: string; date: Temporal.PlainDate }>();

onMounted(() => {
	window.addEventListener("resize", () => {
		setTimeout(() => {
			resize.value = !resize.value;
		}, 25); // will not work without timeout, idk why. js strange.
	});
});

function renderStudentHeader(
	draw: Draw,
	idWidth: number,
	firstWidth: number,
	lastWidth: number,
	header_text_pad: number,
	cumWidth: Accumulate,
) {
	/*
	 * student info header is always fixed-in-place
	 * i do want to find the longest first, last name however
	 * to size the column properly. comparing the size of the text
	 * rather than the length of the string
	 */
	draw.rect(
		0,
		0,
		cumWidth.add_diff(idWidth),
		HEADER_HEIGHT,
		Colors.cardHover,
		Colors.card2Hover,
	);
	draw.text(
		"Student ID",
		cumWidth.prev + header_text_pad,
		header_text_pad,
		FontSize.lg,
	);

	draw.rect(
		cumWidth.value,
		0,
		cumWidth.add_diff(firstWidth),
		HEADER_HEIGHT,
		Colors.cardHover,
		Colors.card2Hover,
	);
	draw.text(
		"First Name",
		cumWidth.prev + header_text_pad,
		header_text_pad,
		FontSize.lg,
	);

	draw.rect(
		cumWidth.value,
		0,
		cumWidth.add_diff(lastWidth),
		HEADER_HEIGHT,
		Colors.cardHover,
		Colors.card2Hover,
	);
	draw.text(
		"Last Name",
		cumWidth.prev + header_text_pad,
		header_text_pad,
		FontSize.lg,
	);

	return cumWidth;
}

watch(
	[ready, table, () => tableData.length, resize],
	([isReady, canvas, _tl, _rs]) => {
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

		if (!isReady || !canvas) return;

		const draw = new Draw(canvas.getContext("2d")!, canvas);
		draw.clear();

		const HEADER_TEXT_PAD = (HEADER_HEIGHT - draw.textHeight(FontSize.lg)) / 2;
		const CELL_TEXT_PAD = (ROW_HEIGHT - draw.textHeight()) / 2;

		// measure widths
		const firstWidth = Math.max(
			...Array.from(tableData.values()).map(
				(s) => draw.measureText(s.first).width + 2 * CELL_TEXT_PAD,
			),
			draw.measureText("First Name", FontSize.lg).width + 2 * HEADER_TEXT_PAD,
		);
		const lastWidth = Math.max(
			...Array.from(tableData.values()).map(
				(s) => draw.measureText(s.last).width + 2 * CELL_TEXT_PAD,
			),
			draw.measureText("Last Name", FontSize.lg).width + 2 * HEADER_TEXT_PAD,
		);
		const idWidth =
			draw.measureText("Student ID", FontSize.lg).width + 2 * HEADER_TEXT_PAD;

		const cumWidth = new Accumulate();

		// draw student header
		renderStudentHeader(
			draw,
			idWidth,
			firstWidth,
			lastWidth,
			HEADER_TEXT_PAD,
			cumWidth,
		);

		// name section is always fixed-in-place so can render independent of scrollX
		if (xyWatch.value) xyWatch.value.stop();

		xyWatch.value = watch(
			[scrollX, scrollY],
			([x, y]) => {
				const CELL_MIN_WIDTH =
					draw.measureText("X.XX Hours").width + // longest possible text
					2 * CELL_TEXT_PAD + // padding for the text (measure from cell, not inner card)
					(ROW_HEIGHT - 2 * Pad.xs); // button width

				const scrollWidth = new Accumulate(0);
				const scrollHeight = new Accumulate(0);

				let xStart = 0;
				let yStart = 0;

				while (scrollWidth.value <= x) {
					const date = tableData[0]!.cells[xStart]!.date;
					const dateWidth = draw.measureText(dateFmt(date)).width;
					scrollWidth.add_diff(
						Math.max(dateWidth + 2 * Pad.md, CELL_MIN_WIDTH),
					);
					xStart++;
				}

				while (scrollHeight.value <= y) {
					scrollHeight.add_diff(ROW_HEIGHT);
					yStart++;
				}

				xStart--; // algo does one too many iterations
				yStart--;

				const xOffset = scrollWidth.prev - x;
				const yOffset = scrollHeight.prev - y;
				const wBegin = cumWidth.value + xOffset;

				const cumHeight = new Accumulate(HEADER_HEIGHT + yOffset);
				cumWidth.reset(wBegin);
				lookup.clear();

				let oddRow = yStart % 2 === 0;
				for (const student of tableData.slice(yStart)) {
					if (cumHeight.value > canvas.height) break;

					for (const cell of student.cells.slice(xStart)) {
						if (cumWidth.value > canvas.width) break;

						const dateWidth = draw.measureText(dateFmt(cell.date)).width;
						const cellWidth = Math.max(dateWidth + 2 * Pad.md, CELL_MIN_WIDTH);
						draw.rect(
							cumWidth.value,
							cumHeight.value,
							cumWidth.add_diff(cellWidth),
							ROW_HEIGHT,
							oddRow ? Colors.backgroundDark : Colors.cardActive,
							Colors.card2Hover,
						);
						draw.roundRect(
							cumWidth.prev + Pad.xs,
							cumHeight.value + Pad.xs,
							cellWidth - 2 * Pad.xs,
							ROW_HEIGHT - 2 * Pad.xs,
							Colors.drop,
							Colors.drop,
						);
						draw.text(
							entriesLabel(cell.entries),
							cumWidth.prev + CELL_TEXT_PAD,
							cumHeight.value + CELL_TEXT_PAD,
							1,
							Colors.textSub,
						);

						// button time
						const btnSize = ROW_HEIGHT - 2 * Pad.xs;
						const btnX = cumWidth.value - Pad.xs - btnSize;
						const btnY = cumHeight.value + Pad.xs;
						const btnMaxX = btnX + btnSize;
						const btnMaxY = btnY + btnSize;

						draw.roundRect(
							btnX,
							btnY,
							btnSize,
							btnSize,
							Colors.card,
							Colors.card,
						);
						draw.icon(
							btnX + btnSize / 16,
							btnY + btnSize / 16,
							btnSize * 0.875,
							btnSize * 0.875,
							"/caret-down.svg",
						);

						lookup.insert(btnX, btnMaxX, btnY, btnMaxY, {
							studentId: student.hashed,
							date: cell.date,
						});
					}

					cumHeight.add_diff(ROW_HEIGHT);
					cumWidth.reset(wBegin);
					oddRow = !oddRow;
				}

				// render the data header
				cumHeight.reset(0);
				for (const cell of tableData[0]!.cells.slice(xStart)) {
					if (cumWidth.value > canvas.width) break;

					const dateWidth = draw.measureText(dateFmt(cell.date)).width;
					const cellWidth = Math.max(dateWidth + 2 * Pad.md, CELL_MIN_WIDTH);

					draw.rect(
						cumWidth.value,
						cumHeight.value,
						cumWidth.add_diff(cellWidth),
						HEADER_HEIGHT,
						Colors.card,
						Colors.card2Hover,
					);

					draw.text(
						dateFmt(cell.date),
						cumWidth.prev + Pad.md,
						(HEADER_HEIGHT - draw.textHeight(FontSize.lg)) / 2,
						FontSize.lg,
					);
				}

				// rerender the student info data cells
				cumWidth.reset(0);
				cumHeight.reset(HEADER_HEIGHT + yOffset);
				oddRow = yStart % 2 === 0;
				for (const student of tableData.slice(yStart)) {
					if (cumHeight.value > canvas.height) break;

					// id cell
					draw.rect(
						0,
						cumHeight.value,
						cumWidth.add_diff(idWidth),
						ROW_HEIGHT,
						oddRow ? Colors.cardActive : Colors.card,
						Colors.card2Hover,
					);
					draw.text(
						student.id,
						cumWidth.prev + CELL_TEXT_PAD,
						cumHeight.value + CELL_TEXT_PAD,
					);

					// first name cell
					draw.rect(
						cumWidth.value,
						cumHeight.value,
						cumWidth.add_diff(firstWidth),
						ROW_HEIGHT,
						oddRow ? Colors.cardActive : Colors.card,
						Colors.card2Hover,
					);
					draw.text(
						student.first,
						cumWidth.prev + CELL_TEXT_PAD,
						cumHeight.value + CELL_TEXT_PAD,
					);

					// last name cell
					draw.rect(
						cumWidth.value,
						cumHeight.value,
						cumWidth.add_diff(lastWidth),
						ROW_HEIGHT,
						oddRow ? Colors.cardActive : Colors.card,
						Colors.card2Hover,
					);
					draw.text(
						student.last,
						cumWidth.prev + CELL_TEXT_PAD,
						cumHeight.value + CELL_TEXT_PAD,
					);

					cumHeight.add_diff(ROW_HEIGHT);
					cumWidth.reset(0);
					oddRow = !oddRow;
				}

				/*
				 * if we've scrolled, we've 100% drawn over the student info header. redraw it.
				 */
				renderStudentHeader(
					draw,
					idWidth,
					firstWidth,
					lastWidth,
					HEADER_TEXT_PAD,
					new Accumulate(),
				);
			},
			{ immediate: true },
		);
	},
);

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
		sub: "StudentData",
		token: token.value!,
	});

	const ratedMouseMove = useThrottleFn((ev: MouseEvent) => {
		const mouseX = ev.clientX;
		const mouseY = ev.clientY;
		const canvas = table.value;

		// undef check
		if (canvas === null || canvas === undefined) return;

		// get pos of mouse on canvas
		const box = canvas.getBoundingClientRect();
		const btn = lookup.query(mouseX - box.left, mouseY - box.top);

		if (btn.isSome()) {
			canvas!.style.cursor = "pointer";
		} else {
			canvas!.style.cursor = "default";
		}
	}, 50);

	window.addEventListener("mousemove", ratedMouseMove);
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
