import { type ColDef, type ColGroupDef, themeQuartz, type ValueFormatterParams } from "ag-grid-community";
import { Temporal } from "temporal-polyfill";
import type { HourType } from "~/utils/api";
import { Math2 } from "~/utils/math";
import type { Student } from "./useTable";

export type AgRow = {
    studentId: string;
    first: string;
    last: string;
    [date: string]: any;
    total: number;
} & Record<HourType, number>;

function dateFmt(date: Temporal.PlainDate) {
    const now = Temporal.Now.plainDateISO();

    const full = { month: "long", day: "2-digit", year: "numeric" } as const;
    const mini = { month: "2-digit", day: "2-digit", year: "2-digit" } as const;

    if (now.year !== date.year) {
        return date.toLocaleString("en", full);
    }

    if (now.weekOfYear !== date.weekOfYear) {
        return date.toLocaleString("en", { month: "long", day: "2-digit" });
    }

    const formatted = date.toLocaleString("en", mini);

    if (Temporal.PlainDate.compare(now, date) === 0) {
        return `Today (${formatted})`;
    }

    if (Temporal.PlainDate.compare(now.subtract({ days: 1 }), date) === 0) {
        return `Yesterday (${formatted})`;
    }

    const weekday = date.toLocaleString("en", { weekday: "long" });
    return `${weekday} (${formatted})`;
}

function hourFormat(hours: ValueFormatterParams): string {
    if (hours.value === 0) return "N/A";

    return Math2.formatHours(hours.value as number);
}

export function useAgData(data: ComputedRef<Student[]>) {
    const ag = computedWithControl(data, () => {
        const students = data.value;
        if (students.length === 0) {
            return {
                columns: [],
                rows: [],
            };
        }

        const columns: (ColGroupDef<AgRow> | ColDef<AgRow>)[] = [
            {
                headerName: "Student Info",
                children: [
                    {
                        field: "studentId",
                        headerName: "Student ID",
                        pinned: "left",
                        columnGroupShow: "open",
                    },
                    {
                        field: "first",
                        headerName: "First Name",
                        pinned: "left",
                        editable: true,
                    },
                    {
                        field: "last",
                        headerName: "Last Name",
                        pinned: "left",
                        editable: true,
                    },
                ],
            },
            {
                headerName: "Hours",
                children: [
                    ...students[0]!.cells.map((cell) => ({
                        field: cell.date.toJSON(),
                        headerName: dateFmt(cell.date),
                        columnGroupShow: "open" as const,
                        cellRenderer: "Dropdown",
                        sortable: false,
                        filter: false,
                    })),
                    {
                        field: "offseason",
                        headerName: "Offseason",
                        columnGroupShow: "closed",
                        valueFormatter: hourFormat,
                    },
                    {
                        field: "build",
                        headerName: "Build",
                        columnGroupShow: "closed",
                        valueFormatter: hourFormat,
                    },
                    {
                        field: "learning",
                        headerName: "Learning",
                        columnGroupShow: "closed",
                        valueFormatter: hourFormat,
                    },
                    {
                        field: "demo",
                        headerName: "Outreach",
                        columnGroupShow: "closed",
                        valueFormatter: hourFormat,
                    },
                ],
            },
            {
                field: "total",
                headerName: "Total",
                pinned: "right",
                valueFormatter: hourFormat,
            },
        ] as const;

        const rows: AgRow[] = students.map((student) => ({
            studentId: student.id,
            first: student.first,
            last: student.last,
            ...student.cells.reduce(
                (acc, cell) => {
                    const hours = cell.entries
                        .filter((entry) => !!entry.end)
                        .reduce((total, entry) => {
                            const diff = entry.end!.since(entry.start);
                            return total + diff.total("hours");
                        }, 0);

                    acc[cell.date.toJSON()] = hours;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            ...student.cells.reduce(
                (acc, cell) => {
                    for (const entry of cell.entries) {
                        if (!entry.end) continue;
                        const diff = entry.end.since(entry.start);
                        const hours = diff.total("hours");
                        acc[entry.kind] += hours;
                        acc.total += hours;
                    }
                    return acc;
                },
                {
                    offseason: 0,
                    build: 0,
                    learning: 0,
                    demo: 0,
                    total: 0,
                },
            ),
        }));

        return { columns, rows };
    });

    return {
        columns: computed(() => ag.value.columns),
        rows: computed(() => ag.value.rows),
    };
}

export const Theme = themeQuartz.withParams({
    accentColor: "#d7d7d7",
    backgroundColor: "#171717",
    borderColor: "#4D4D4DA0",
    browserColorScheme: "dark",
    fontFamily: "inherit",
    foregroundColor: "#D7D7D7",
    headerBackgroundColor: "#303030",
    columnBorder: true,
});
