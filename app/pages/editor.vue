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

const { $gsap } = useNuxtApp();
const token = useToken();
const password = usePassword();

const isFirefox = /firefox/i.test(navigator.userAgent);

interface Cell {
	date: Temporal.PlainDate;
	entries: Ref<TimeEntry>[];
}

interface Student {
	id: string;
	first: string;
	last: string;
	hashed: string;
	cells: Reactive<Cell[]>;
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

	function pad2(n: number) {
		return n.toString().padStart(2, "0");
	}

	const MONTHS = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	const WEEKDAYS = [
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
		"Sunday",
	];

	if (now.year !== date.year)
		return `${MONTHS[date.month - 1]} ${pad2(date.day)}, ${date.year}`;

	if (now.weekOfYear !== date.weekOfYear)
		return `${MONTHS[date.month - 1]} ${pad2(date.day)}`;

	if (now.day === date.day)
		return `Today (${pad2(date.day)}/${pad2(date.month)}/${pad2(date.year % 100)})`;
	if (now.day - 1 === date.day)
		return `Yesterday (${pad2(date.day)}/${pad2(date.month)}/${pad2(date.year % 100)})`;

	return `${WEEKDAYS[date.dayOfWeek - 1]} (${pad2(date.day)}/${pad2(date.month)}/${pad2(date.year % 100)})`;
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

// functionality
const Pad = {
	md: Convert.remToPx(1),
	xs: Convert.remToPx(0.5),
	sm: Convert.remToPx(0.95),
};

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 48;
const HEAD_TEXT_PAD = new LateInit<number>();
const CELL_TEXT_PAD = new LateInit<number>();
const INFO_WIDTH = new LateInit<number>();

const scrollX = ref(0);
const scrollY = ref(0);
const resize = ref(false);

const table = ref<HTMLCanvasElement>();

const vCanvasReady = ref(false);
const vDataHeaderCanvas = new Lazy(() => new VirtualCanvas());
const vInfoHeaderCanvas = new Lazy(() => new VirtualCanvas());
const vDataCanvas = new Lazy(() => new VirtualCanvas());
const vInfoCanvas = new Lazy(() => new VirtualCanvas());

const lookup = new PBLookup<{ studentId: string; date: Temporal.PlainDate }>();

watch(
	[
		ready,
		() => ({
			data: vDataCanvas.value,
			info: vInfoCanvas.value,
			header: {
				data: vDataHeaderCanvas.value,
				info: vInfoHeaderCanvas.value,
			},
		}),
		() => tableData.length,
	],
	([isReady, v, _tl]) => {
		if (!isReady) return;

		const p = new Profiler("Redraw canvas");

		vCanvasReady.value = false;

		v.data.clear();
		v.info.clear();
		v.header.data.clear();
		v.header.info.clear();

		HEAD_TEXT_PAD.init((HEADER_HEIGHT - v.data.textHeight(FontSize.lg)) / 2);
		CELL_TEXT_PAD.init((ROW_HEIGHT - v.data.textHeight()) / 2);

		const textWidthPadded = memoize(
			(s: string, isHeader = false, size?: number) => {
				const fontSizeFinal =
					size ?? (isHeader ? FontSize.lg : FontSize.normal);
				const padding = isHeader
					? 2 * HEAD_TEXT_PAD.value
					: 2 * CELL_TEXT_PAD.value;
				return v.data.textSize(s, fontSizeFinal).width + padding;
			},
		);

		// measure widths
		const idWidth = textWidthPadded("Student ID", true);
		const firstWidth = Math.max(
			...Array.from(tableData.values()).map((w) => textWidthPadded(w.first)),
			textWidthPadded("First Name", true),
		);
		const lastWidth = Math.max(
			...Array.from(tableData.values()).map((w) => textWidthPadded(w.last)),
			textWidthPadded("Last Name", true),
		);

		INFO_WIDTH.init(idWidth + firstWidth + lastWidth);

		// draw the info header
		const accumX = new Accumulate();
		const accumY = new Accumulate();

		v.header.info.rect(
			accumX,
			accumY.value,
			idWidth,
			HEADER_HEIGHT,
			Colors.cardHover,
			Colors.card2Hover,
		);
		v.header.info.text(
			"Student ID",
			accumX.prev + HEAD_TEXT_PAD.value,
			HEAD_TEXT_PAD.value,
			{ size: FontSize.lg },
		);

		v.header.info.rect(
			accumX,
			accumY.value,
			firstWidth,
			HEADER_HEIGHT,
			Colors.cardHover,
			Colors.card2Hover,
		);
		v.header.info.text(
			"First Name",
			accumX.prev + HEAD_TEXT_PAD.value,
			HEAD_TEXT_PAD.value,
			{ size: FontSize.lg },
		);

		v.header.info.rect(
			accumX,
			accumY.value,
			lastWidth,
			HEADER_HEIGHT,
			Colors.cardHover,
			Colors.card2Hover,
		);
		v.header.info.text(
			"Last Name",
			accumX.prev + HEAD_TEXT_PAD.value,
			HEAD_TEXT_PAD.value,
			{ size: FontSize.lg },
		);

		console.log(INFO_WIDTH.value, accumX.value);

		const CELL_MIN_WIDTH =
			textWidthPadded("X.XX Hours") + // longest possible text
			(ROW_HEIGHT - 2 * Pad.xs); // button width

		lookup.clear();

		let odd = true;
		for (const student of tableData) {
			accumX.set(0);

			const bgLight = odd ? Colors.cardActive : Colors.card;
			const bgDark = odd ? Colors.backgroundDark : Colors.cardActive;

			// id
			v.info.rect(
				accumX,
				accumY.value,
				idWidth,
				ROW_HEIGHT,
				bgLight,
				Colors.card2Hover,
			);
			v.info.text(
				student.id,
				accumX.prev + CELL_TEXT_PAD.value,
				accumY.value + CELL_TEXT_PAD.value,
				{ size: FontSize.lg },
			);

			// first name
			v.info.rect(
				accumX,
				accumY.value,
				firstWidth,
				ROW_HEIGHT,
				bgLight,
				Colors.card2Hover,
			);
			v.info.text(
				student.first,
				accumX.prev + CELL_TEXT_PAD.value,
				accumY.value + CELL_TEXT_PAD.value,
			);

			// last name
			v.info.rect(
				accumX,
				accumY.value,
				lastWidth,
				ROW_HEIGHT,
				bgLight,
				Colors.card2Hover,
			);
			v.info.text(
				student.last,
				accumX.prev + CELL_TEXT_PAD.value,
				accumY.value + CELL_TEXT_PAD.value,
			);

			// data cells, reset accumX, different canvas
			accumX.set(0);

			for (const cell of student.cells) {
				const dateWidth = textWidthPadded(dateFmt(cell.date), true);
				const cellWidth = Math.max(dateWidth, CELL_MIN_WIDTH);

				// header (date)
				v.header.data.rect(
					accumX.value,
					0,
					cellWidth,
					HEADER_HEIGHT,
					Colors.card,
					Colors.card2Hover,
				);
				v.header.data.text(
					dateFmt(cell.date),
					accumX.value + HEAD_TEXT_PAD.value,
					HEAD_TEXT_PAD.value,
					{ size: FontSize.lg },
				);

				// data (rect, rect, label, button)
				v.data.rect(
					accumX,
					accumY.value,
					cellWidth,
					ROW_HEIGHT,
					bgDark,
					Colors.card2Hover,
				);
				v.data.roundRect(
					accumX.prev + Pad.xs,
					accumY.value + Pad.xs,
					cellWidth - 2 * Pad.xs,
					ROW_HEIGHT - 2 * Pad.xs,
					Colors.drop,
					Colors.drop,
				);
				v.data.text(
					entriesLabel(cell.entries),
					accumX.prev + CELL_TEXT_PAD.value,
					accumY.value + CELL_TEXT_PAD.value,
					{ color: Colors.textSub },
				);

				// button time
				const btnSize = ROW_HEIGHT - 2 * Pad.xs;
				const btnX = accumX.value - Pad.xs - btnSize;
				const btnY = accumY.value + Pad.xs;
				const btnMaxX = btnX + btnSize;
				const btnMaxY = btnY + btnSize;

				v.data.roundRect(
					btnX,
					btnY,
					btnSize,
					btnSize,
					Colors.card,
					Colors.card,
				);
				v.data.icon(
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

			accumY.add(ROW_HEIGHT);
			odd = !odd;
		}

		p.stop();
		vCanvasReady.value = true;
	},
);

watch(
	[scrollX, scrollY, vCanvasReady, table, resize],
	([scrollX, scrollY, vReady, canvas, _rs]) => {
		if (!vReady || !canvas) return;
		const p = new Profiler("Apply canvas to screen");

		const ctx = canvas.getContext("2d")!;
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.imageSmoothingEnabled = false;

		const cumX = new Accumulate();
		const cumY = new Accumulate();

		// info header
		vInfoHeaderCanvas.value.paste(ctx, cumX.value, cumY);

		// info data
		vInfoCanvas.value.paste(
			ctx,
			cumX,
			cumY,
			0,
			scrollY,
			INFO_WIDTH.value,
			rect.height - HEADER_HEIGHT,
		);

		// reset
		cumY.set(0);

		// data header
		vDataHeaderCanvas.value.paste(
			ctx,
			cumX.value,
			cumY,
			scrollX,
			0,
			rect.width - cumX.value,
			HEADER_HEIGHT,
		);

		// data
		vDataCanvas.value.paste(
			ctx,
			cumX,
			cumY,
			scrollX,
			scrollY,
			rect.width - cumX.value,
			rect.height - HEADER_HEIGHT,
		);

		p.stop();
	},
);

const canvasScroll = (ev: WheelEvent) => {
	const scrollFactor = isFirefox ? 1.25 : 0.5;

	if (ev.shiftKey) {
		scrollX.value += ev.deltaY * scrollFactor;
		scrollY.value += ev.deltaX * scrollFactor;
	} else {
		scrollX.value += ev.deltaX * scrollFactor;
		scrollY.value += ev.deltaY * scrollFactor;
	}

	if (scrollX.value < 0) scrollX.value = 0;
	if (scrollY.value < 0) scrollY.value = 0;
	if (!table.value) return;

	const dpr = window.devicePixelRatio || 1;
	const tblW = table.value.width / dpr;
	const tblH = table.value.height / dpr;
	const maxX = dpr*vDataCanvas.value.width - tblW + INFO_WIDTH.value;
	const maxY = dpr*vDataCanvas.value.height - tblH + HEADER_HEIGHT;
	if (scrollX.value > maxX) scrollX.value = maxX;
	if (scrollY.value > maxY) scrollY.value = maxY;
};

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
		const btn = lookup.query(
			mouseX - box.left - INFO_WIDTH.value,
			mouseY - box.top - HEADER_HEIGHT,
		);

		if (btn.isSome()) {
			canvas!.style.cursor = "pointer";
		} else {
			canvas!.style.cursor = "default";
		}
	}, 50);

	window.addEventListener("mousemove", ratedMouseMove);

	window.addEventListener("resize", () => {
		resize.value = !resize.value;
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

		<div class="table-container relative">
			<canvas ref="table" class="table" @wheel.prevent="canvasScroll" />
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

		<div v-if="isFirefox" class="text-[1.5rem] mt-6">
			Firefox has abysmal canvas performance. I have tried
			<br />
			my best to speed things up, but consider not using Firefox.
			<br />
			Thank you for understanding <Icon name="hugeicons:favourite" class="text-red-500" size="16" />
		</div>
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
	@apply flex flex-col justify-center items-center;
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
