import { Temporal } from "temporal-polyfill";
import type { DeepReadonly } from "vue";
import { toast } from "vue-sonner";
import type { AuthData } from "~/plugins/auth";
import type { Record as AttendanceRecordRaw, ReplicationRecord, ReplicationStudent, Student } from "~/utils/api";
import api from "~/utils/api";

export type AttendanceRecord = Omit<AttendanceRecordRaw, "sign_in" | "sign_out"> & {
    sign_in: Temporal.ZonedDateTime;
    sign_out: Temporal.ZonedDateTime | null;
};

export interface Cell {
    date: Temporal.PlainDate;
    records: AttendanceRecord[];
}

export type Row = Student & {
    cells: Cell[];
};

interface TableProps {
    user: AuthData & { role: "admin"; ok: true; };
    connected: Ref<boolean>;
    onError: () => void;
}

export async function useTable({ user, onError, connected }: TableProps) {
    const creds = { ...user };
    const k1 = hex.asbytes(creds.k1);
    const crypto = useCrypto();

    const data: Row[] = [];
    const uncategorized: Map<string, AttendanceRecord[]> = new Map();
    const update = ref(0);

    function fromraw(record: AttendanceRecordRaw): AttendanceRecord {
        return {
            ...record,
            sign_in: api.datetime.parse(record.sign_in),
            sign_out: api.datetime.parse(record.sign_out),
        };
    }

    function uncategorize(record: AttendanceRecordRaw | AttendanceRecord) {
        const records = uncategorized.get(record.sid_hashed) ?? [];
        if (typeof record.sign_in === "string") records.push(fromraw(record as AttendanceRecordRaw));
        else records.push(record as AttendanceRecord);
        uncategorized.set(record.sid_hashed, records);
    }

    async function record(repl: ReplicationRecord) {
        let err = false;

        switch (repl.operation) {
            case "INSERT": {
                const r1 = fromraw(repl);

                const student = data.find((s) => s.id_hashed === r1.sid_hashed);
                if (!student) {
                    uncategorize(repl);
                    break;
                }

                const date = r1.sign_in.withTimeZone(Temporal.Now.timeZoneId()).toPlainDate();
                let cell = student.cells.find((c) => c.date.equals(date));
                if (!cell) {
                    // insert into every student, sorted.
                    for (const s of data) {
                        const c = {
                            date,
                            records: [],
                        };

                        const i = s.cells.findIndex((cc) => {
                            return cc.date.until(date).total("milliseconds") > 0;
                        });

                        if (i === -1) s.cells.push(c);
                        else s.cells.splice(i, 0, c);

                        if (s.id_hashed === r1.sid_hashed) cell = c;
                    }
                }

                if (!cell) {
                    err = true;
                    break;
                }

                const i = cell.records.findIndex((r) => {
                    return r.sign_in.until(r.sign_in).total("milliseconds") > 0;
                });

                if (i === -1) cell.records.push(r1);
                else cell.records.splice(i, 0, r1);

                break;
            }
            case "UPDATE": {
                const r0 = [
                    ...data.flatMap(s => s.cells).flatMap(c => c.records),
                    ...uncategorized.values().flatMap(r => r),
                ]
                    .find(r => r.id === repl.id);

                if (!r0) {
                    err = true;
                    break;
                }

                const r1 = safeassign(r0, {
                    ...repl,
                    sign_in: api.datetime.parse(repl.sign_in),
                    sign_out: api.datetime.parse(repl.sign_out),
                });

                const s0 = data.find(s => s.id_hashed === r0.sid_hashed);

                // remove from old student, if applicable
                if (!!repl.sid_hashed && r0.sid_hashed !== repl.sid_hashed && s0) {
                    const d0 = r0.sign_in.withTimeZone(Temporal.Now.timeZoneId()).toPlainDate();
                    const c0 = s0.cells.find(c => c.date.equals(d0))!;
                    const i0 = c0.records.findIndex(r => r.id === r0.id);
                    c0.records.splice(i0, 1);

                    // add to new student
                    const s1 = data.find(s => s.id_hashed === repl.sid_hashed);
                    const c1 = s1?.cells.find(c => c.date.equals(d0));
                    const i1 = c1?.records.findIndex(rr => {
                        return rr.sign_in.until(r1.sign_in).total("milliseconds") > 0;
                    });

                    if (!s1 || !c1 || !i1) {
                        uncategorize(r1);
                        break;
                    }

                    if (i1 === -1) c1.records.push(r1);
                    else c1.records.splice(i1, 0, r1);
                    break;
                }

                Object.assign(r0, r1);
                break;
            }
            case "DELETE": {
                const r0 = [
                    ...data.flatMap(s => s.cells).flatMap(c => c.records),
                    ...uncategorized.values().flatMap(r => r),
                ]
                    .find(r => r.id === repl.pkey);

                if (!r0) {
                    err = true;
                    break;
                }

                const s0 = data.find(s => s.id_hashed === r0.sid_hashed);

                if (s0) {
                    const d0 = r0.sign_in.withTimeZone(Temporal.Now.timeZoneId()).toPlainDate();
                    const c0 = s0.cells.find(c => c.date.equals(d0))!;
                    const i0 = c0.records.findIndex(r => r.id === r0.id);
                    c0.records.splice(i0, 1);
                } else {
                    const records = uncategorized.get(r0.sid_hashed);
                    if (!records) {
                        err = true;
                        break;
                    }
                    const i0 = records.findIndex(r => r.id === r0.id);
                    records.splice(i0, 1);
                }

                break;
            }
        }

        update.value++;
        return !err;
    }

    async function student(repl: ReplicationStudent) {
        let err = false;

        switch (repl.operation) {
            case "INSERT": {
                const cells: Cell[] = data.length > 0
                    ? data[0]!.cells.map(c => ({
                        date: c.date,
                        records: [],
                    }))
                    : [];

                const { id, first, last } = repl;
                const [id2, first2, last2] = await crypto.decrypt([id, first, last], k1) ?? ["", "", ""];

                if (!id2 || !first2 || !last2) {
                    err = true;
                    break;
                }

                data.push({
                    ...repl,
                    id: id2,
                    first: first2,
                    last: last2,
                    cells,
                });

                if (uncategorized.has(repl.id_hashed)) {
                    const records = uncategorized.get(repl.id_hashed) ?? [];
                    for (const r of records) {
                        record({
                            operation: "INSERT",
                            ...r,
                            sign_in: api.datetime.ser(r.sign_in),
                            sign_out: r.sign_out ? api.datetime.ser(r.sign_out) : null,
                        });
                    }
                }

                break;
            }
            case "UPDATE": {
                const student = data.find(s => s.id_hashed === repl.id_hashed);
                if (!student) {
                    err = true;
                    break;
                }

                const { id, first, last } = repl;
                const [id2] = id ? await crypto.decrypt([id], k1) ?? [null] : [undefined];
                const [first2] = first ? await crypto.decrypt([first], k1) ?? [null] : [undefined];
                const [last2] = last ? await crypto.decrypt([last], k1) ?? [null] : [undefined];

                if (id2 === null || first2 === null || last2 === null) {
                    err = true;
                    break;
                }

                safeassign(student, {
                    id: id2,
                    first: first2,
                    last: last2,
                });
                break;
            }
            case "DELETE": {
                const i = data.findIndex(s => s.id_hashed === repl.pkey);
                if (i === -1) {
                    err = true;
                    break;
                }

                data.splice(i, 1);
                break;
            }
        }

        update.value++;
        return !err;
    }

    interface Handler<T = any> {
        ctor: () => Promise<{ stream: AsyncGenerator<T[]>; }>;
        f: (a: T) => Promise<boolean>;
    }

    const sse = async <H extends Handler[]>(
        hs: H,
        tries = 0,
    ) => {
        const perf = new Performance();
        const readystart = perf.now();

        const { signal, abort } = new AbortController();
        await Promise.any(hs.map(async h => {
            try {
                const { ctor, f } = h;
                const { stream } = await ctor();
                connected.value = true;
                for await (const batch of stream) {
                    if (signal.aborted) break;
                    const res = await Promise.all(batch.map(f));
                    if (res.includes(false)) onError();
                }
            } catch (e) {}
        }));
        abort();

        const readyend = perf.now();
        const dt = readyend - readystart;

        if (tries > 5) return;
        const timer = defineComponent({
            setup() {
                const t = ref((tries + 1) * 5);
                const ctr = setInterval(() => t.value -= 1, 1000);
                onUnmounted(() => clearInterval(ctr));
                return () => h("span", `Lost connection with the server. Trying again in ${t.value} seconds`);
            },
        });
        toast.warning(timer, { duration: (tries + 1) * 5000 });

        await sleep((tries + 1) * 5000);
        await sse(hs, dt < 5000 ? tries + 1 : 0);
    };

    const students = await api.student.list();
    if (!students.data) {
        api.error(students.error, students.response);
        return;
    }

    for (const s of students.data.students) student({ operation: "INSERT", ...s });

    const records = await api.roster.record.query();
    if (!records.data) {
        api.error(records.error, records.response);
        return;
    }

    if (records.data.quantity !== "Many") throw new Error("unreachable");
    for (const r of Object.values(records.data.records)) record({ operation: "INSERT", ...r });

    function connect() {
        return sse([
            { ctor: api.roster.record.stream, f: record },
            { ctor: api.student.stream, f: student },
        ]).then(() => connected.value = false);
    }

    connect();

    return {
        reconnect: connect,
        data: watched(() => data, update),
    };
}
