<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import type { Reactive } from "vue";
import { toast } from "vue-sonner";
import { Math2 } from "~/utils/math";
import {
	makeWebsocket,
	type ReplicateQuery,
	type TimeEntry,
	type UpdateQuery,
} from "~/utils/zodws/api";
import "~/style/tailwind.css";
import type { HoverCard } from "#components";

const token = useToken();
const password = usePassword();

const isFirefox = useIsFirefox();
const DPR = new Lazy(() => window.devicePixelRatio || 1);

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
const undoStack: UpdateQuery[] = [];
const redoStack: UpdateQuery[] = [];
const activeStack = ref(undoStack);

const studentData = new JsonDb(StudentData, []);
const ready = ref(false);
const txnInProgress = ref(false);

function apply(q: ReplicateQuery): void {
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
							Array.from(c.entries.entries().map(([_, entry]) => ref(entry))),
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

		return;
	}

	let inverse: UpdateQuery;

	if (q.type === "Create") {
		let date = tableData
			.find((s) => s.hashed === q.studentId)
			?.cells.find((c) => c.date.equals(q.date));

		if (!date) {
			let i = tableData[0]?.cells.length ? 0 : undefined;
			for (const student of tableData) {
				if (!i) {
					// dates are sorted dsc, binsearch for insert point
					let left = 0;
					let right = student.cells.length;

					while (left < right) {
						const mid = Math.floor((left + right) / 2);
						const item = student.cells[mid]!;

						if (q.date > item.date) {
							right = mid;
						} else {
							left = mid + 1;
						}
					}

					i = left;
				}

				const cell = {
					date: q.date,
					entries: reactive([]),
				};

				student.cells.splice(i, 0, cell);

				if (student.hashed === q.studentId) {
					date = cell;
				}
			}
		}

		// i.e. if no student in tableData matches
		if (!date) return;

		// insert entry sorted by start time asc
		if (date.entries.length === 0) {
			date.entries.push(ref(q.entry));
			return;
		}

		let left = 0;
		let right = date.entries.length;

		while (left < right) {
			const mid = Math.floor((left + right) / 2);
			const item = date.entries[mid]!;

			if (Temporal.ZonedDateTime.compare(q.entry.start, item.value.start) < 0) {
				right = mid - 1;
			} else {
				left = mid + 1;
			}
		}

		date.entries.splice(left, 0, ref(q.entry));

		inverse = {
			type: "Delete",
			id: q.entry.id,
		};

		activeStack.value.push(inverse);

		relabel({
			hashed: q.studentId,
			date: q.date.toJSON(),
		});
	} else if (q.type === "Update") {
		const ref = tableData
			.find((s) => s.hashed === q.studentId)
			?.cells.find((c) => c.date.equals(q.date))
			?.entries.find((e) => e.value.id === q.id);

		if (!ref) return;

		const entry = { ...ref?.value };

		inverse = {
			type: "Update",
			id: q.id,
			updates: q.updates.map((up) => ({
				type: up.type,
				data: entry[up.type],
			})) as any,
		};
		activeStack.value.push(inverse);

		for (const update of q.updates) {
			const up = narrow(update);
			(entry[up.type] as unknown) = update.data;
		}

		ref.value = { ...entry };

		relabel({
			hashed: q.studentId,
			date: q.date.toJSON(),
		});
	} else if (q.type === "Delete") {
		const entries = tableData
			.find((s) => s.hashed === q.studentId)
			?.cells.find((c) => c.date.equals(q.date))?.entries;

		if (!entries) return;

		const index = entries.findIndex((el) => el.value.id === q.id);

		if (index === -1) return;

		const entry = entries.splice(index, 1)[0]!;

		inverse = {
			type: "Create",
			studentId: q.studentId,
			signIn: entry.value.start,
			signOut: entry.value.end,
			hourType: entry.value.kind,
		};

		activeStack.value.push(inverse);

		relabel({
			hashed: q.studentId,
			date: q.date.toJSON(),
		});
	}

	activeStack.value = undoStack;
	txnInProgress.value = false;
}

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
			apply(q);
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

			if (["Time", "Data", "Unknown"].includes(data.meta.type)) {
				txnInProgress.value = false;
				cardOpen.value = false;
			}
		},
	},
});

function push(uq: UpdateQuery, shouldClearRedo = true) {
	websocket.send("Update", {
		sub: "Editor",
		value: uq,
	});

	txnInProgress.value = true;

	if (shouldClearRedo) redoStack.splice(0, redoStack.length);
}

function undo() {
	if (undoStack.length === 0) return;
	activeStack.value = redoStack;
	push(undoStack.pop()!, false);
}

function redo() {
	if (undoStack.length === 0) return;
	push(redoStack.pop()!, false);
}

// formatting
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
function cellLabel(entries: MaybeRef<TimeEntry>[]) {
	if (entries.length === 0) return "No data";

	let sum = new Temporal.Duration();

	for (const entryRef of entries) {
		const entry = unref(entryRef);
		if (!entry.end) continue;
		sum = sum.add(entry.start.until(entry.end));
	}

	return Math2.formatHours(sum.total({ unit: "hours" }));
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

interface CellId {
	hashed: string;
	date: string; // Temporal.PlainDate serialized
}

interface DrawLocation {
	x: number;
	y: number;
	width: number;
	height: number;
}

const lookup = new PBLookup<CellId>();
const textRedraw = new Map<string, DrawLocation>(); // key is JSON.stringify(CellId)

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
		() => tableData[tableData.length - 1]?.cells.length || 0,
	],
	([isReady, v, _tl, _cellct]) => {
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

				const cellId = {
					hashed: student.hashed,
					date: cell.date.toJSON(),
				};

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
				const textDraw = v.data.text(
					cellLabel(cell.entries),
					accumX.prev + CELL_TEXT_PAD.value,
					accumY.value + CELL_TEXT_PAD.value,
					{ color: Colors.textSub },
				);

				textRedraw.set(JSON.stringify(cellId), {
					x: accumX.prev + CELL_TEXT_PAD.value,
					y: accumY.value + CELL_TEXT_PAD.value,
					width: textDraw.width,
					height: textDraw.height,
				});

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
				v.data.chevron(
					btnX + btnSize / 16,
					btnY + btnSize / 16,
					btnSize * 0.875,
					btnSize * 0.875,
				);

				lookup.insert(btnX, btnMaxX, btnY, btnMaxY, cellId);
			}

			accumY.add(ROW_HEIGHT);
			odd = !odd;
		}

		p.stop();
		vCanvasReady.value = true;
	},
);

const redraw = ref(false);

const requestRedraw = () => {
	requestAnimationFrame(() => {
		redraw.value = !redraw.value;
	});
};

function relabel(cell: CellId) {
	const loc = textRedraw.get(JSON.stringify(cell));

	if (!loc) return;

	const entries = tableData
		.find((s) => s.hashed === cell.hashed)!
		.cells.find((c) => c.date.equals(cell.date))!.entries;

	const v = vDataCanvas.value;
	const label = cellLabel(entries);

	// clear old text
	v.rect(loc.x, loc.y, loc.width, loc.height, Colors.drop, Colors.drop);

	// draw new text
	const textDraw = v.text(label, loc.x, loc.y, { color: Colors.textSub });

	// update
	textRedraw.set(JSON.stringify(cell), {
		...loc,
		...textDraw,
	});

	requestRedraw();
}

// scrolling and rendering logic
watch(
	[scrollX, scrollY, vCanvasReady, table, resize, redraw],
	([scrollX, scrollY, vReady, canvas, _rs, _rr]) => {
		if (!vReady || !canvas) return;

		const ctx = canvas.getContext("2d")!;

		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * DPR.value;
		canvas.height = rect.height * DPR.value;
		ctx.setTransform(DPR.value, 0, 0, DPR.value, 0, 0);
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
	},
);

let pendingScrollX = 0;
let pendingScrollY = 0;
let pendingResize = false;
let pendingScrollFrame: number | null = null;

const MAX_X_SCROLL = new LateInit<number>();
const MAX_Y_SCROLL = new LateInit<number>();

const commitScroll = () => {
	if (scrollX.value !== pendingScrollX) {
		scrollX.value = pendingScrollX;
	}
	if (scrollY.value !== pendingScrollY) {
		scrollY.value = pendingScrollY;
	}
	if (resize.value !== pendingResize) {
		resize.value = pendingResize;
	}

	pendingScrollFrame = null;
};

const scheduleUpdate = () => {
	if (pendingScrollFrame === null) {
		pendingScrollFrame = requestAnimationFrame(commitScroll);
	}
};

const canvasScroll = (ev: WheelEvent) => {
	// firefox handles scrolling differently, ig?
	const scrollFactor = isFirefox.value ? 1 : 0.5;
	const scrollXFactor = isFirefox.value ? 1.75 : 1;

	if (ev.shiftKey) {
		pendingScrollX += ev.deltaY * scrollFactor * scrollXFactor;
		pendingScrollY += ev.deltaX * scrollFactor;
	} else {
		pendingScrollX += ev.deltaX * scrollFactor * scrollXFactor;
		pendingScrollY += ev.deltaY * scrollFactor;
	}

	if (pendingScrollX < 0) pendingScrollX = 0;
	if (pendingScrollY < 0) pendingScrollY = 0;

	if (!MAX_X_SCROLL.hasValue || !MAX_Y_SCROLL.hasValue) {
		if (!table.value) return;

		const tblW = table.value.width / DPR.value;
		const tblH = table.value.height / DPR.value;

		// bro this math is NOT mathing
		MAX_X_SCROLL.init(
			DPR.value * (vDataCanvas.value.width - (tblW - INFO_WIDTH.value)),
		);
		MAX_Y_SCROLL.init(
			DPR.value * (vDataCanvas.value.height - (tblH - HEADER_HEIGHT)),
		);
	}

	if (pendingScrollX > MAX_X_SCROLL.value) pendingScrollX = MAX_X_SCROLL.value;
	if (pendingScrollY > MAX_Y_SCROLL.value) pendingScrollY = MAX_Y_SCROLL.value;

	scheduleUpdate();
};

// Hovercard logic
const cardOpen = ref(false);
const entries = ref([] as Ref<TimeEntry>[]);
const hashed = ref("");
const date = ref<Temporal.PlainDate>(Temporal.Now.plainDateISO());
const card = ref<InstanceType<typeof HoverCard>>();

const canvasClick = (ev: MouseEvent) => {
	const q = queryAt(ev.clientX, ev.clientY);
	if (!q.isSome()) return;

	const qEntries = tableData
		.find((s) => s.hashed === q.value.hashed)
		?.cells.find((c) => c.date.toJSON() === q.value.date)?.entries;

	if (!qEntries) return;

	console.log(Temporal.PlainDate.from(q.value.date), q.value.date);

	date.value = Temporal.PlainDate.from(q.value.date);
	hashed.value = q.value.hashed;
	entries.value = qEntries;
	cardOpen.value = true;
	card.value?.update();
};

// misc QoL logic
const queryAt = (mouseX: number, mouseY: number) => {
	const canvas = table.value;

	if (!canvas) return None as Option<CellId>;

	const box = canvas.getBoundingClientRect();

	return lookup.query(
		mouseX - box.left - INFO_WIDTH.value + scrollX.value / DPR.value,
		mouseY - box.top - HEADER_HEIGHT + scrollY.value / DPR.value,
	);
};

const ratedMouseMove = useThrottleFn((ev: MouseEvent) => {
	const mouseX = ev.clientX;
	const mouseY = ev.clientY;
	const canvas = table.value;

	// undef check
	if (!canvas) return;

	// get pos of mouse on canvas
	const btn = queryAt(mouseX, mouseY);

	if (btn.isSome()) {
		canvas.style.cursor = "pointer";
	} else {
		canvas.style.cursor = "default";
	}
}, 50);

const onResize = () => {
	pendingResize = !resize.value;
	scheduleUpdate();
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

	window.addEventListener("mousemove", ratedMouseMove);
	window.addEventListener("resize", onResize);
});

// export
function exportCSV() {
	const header = [
		"Student ID",
		"First Name",
		"Last Name",
		"Sign In",
		"Sign Out",
		"In Progress?",
		"For",
	];

	const records = [header.join(",")];

	for (const student of tableData) {
		for (const cell of student.cells) {
			for (const entryRef of cell.entries) {
				const entry = entryRef.value;

				records.push(
					[
						student.id,
						student.first,
						student.last,
						entry.start.toString({ timeZoneName: "never" }),
						entry.end ? entry.end.toString({ timeZoneName: "never" }) : "",
						(!entry.end).toString(),
						entry.kind,
					].join(","),
				);
			}
		}
	}

	const blob = new Blob([records.join("\n")], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");

	link.setAttribute("href", url);
	link.setAttribute("download", "time-entries.csv");
	link.click();
}

onUnmounted(() => {
	window.removeEventListener("mousemove", ratedMouseMove);
	window.removeEventListener("resize", onResize);
	if (pendingScrollFrame !== null) {
		cancelAnimationFrame(pendingScrollFrame);
	}
});

definePageMeta({ layout: "admin-protected" });
</script>

<template>
	<div class="page" v-if="ready">
		<div class="utilities">
			<Button kind="card" class="button exit" @click="$router.push('/admin')">
				<Icon name="hugeicons:logout-02" size="22" />
				Exit
			</Button>

			<Button kind="card" class="button" @click="exportCSV">
				<Icon name="hugeicons:file-export" size="22" />
				Export
			</Button>

			<Button :disabled="undoStack.length === 0" kind="card" class="button" @click="undo">
				<Icon name="hugeicons:undo" size="22" />
				Undo
			</Button>

			<Button :disabled="redoStack.length === 0" kind="card" class="button" @click="redo">
				<Icon name="hugeicons:redo" size="22" />
				Redo
			</Button>

			<Icon 
				v-if="txnInProgress"
				name="svg-spinners:ring-resize" 
				:customize="Customize.StrokeWidth(2)" 
				mode="svg" 
				size="22"
				class="ml-2"
			/>
		</div>

		<div class="table-container">
			<canvas ref="table" class="table" @wheel.prevent="canvasScroll" @click.prevent="canvasClick" />
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

		<div v-if="isFirefox" class="text-[1.25rem] absolute left-1/2 -translate-x-1/2 bottom-24">
			If you notice lag, you're not going insane!
			<br />
			Firefox has some performance issues which 
			<br />
			I have been pulling my hair out over.
			<br />
			Sorry about that, and good luck <Icon name="hugeicons:favourite" class="text-red-500" size="16" />
		</div>
	</div>

	<HoverCard v-model:open="cardOpen" ref="card">
		<Edit :entries="entries" :push="push" :hashed="hashed" :date="date" />
	</HoverCard>
</template>

<style scoped>
@reference '~/style/tailwind.css';

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
