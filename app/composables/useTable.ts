import { Temporal } from "temporal-polyfill";
import type { ShallowRef } from "vue";
import type {
    Record as AttendanceRecordRaw,
    ReplicationRecord,
    Student,
} from "~/utils/api";
import api from "~/utils/api";

export type AttendanceRecord = Omit<
    AttendanceRecordRaw,
    "sign_in" | "sign_out"
> & {
    sign_in: Temporal.ZonedDateTime;
    sign_out: Temporal.ZonedDateTime | null;
};

export interface Cell {
    date: Temporal.PlainDate;
    records: AttendanceRecord[];
}

export type Row = Student & {
    cells?: Cell[];
};

export function useTable() {
    const connected = ref(false);

    const {
        students: data,
        reload: fetchStudents,
    }: {
        students: ShallowRef<Map<string, Row>>;
        reload: () => Promise<unknown>;
    } = useStudentData({
        onInit: () => fetch(true),
    });

    function fromraw(record: AttendanceRecordRaw): AttendanceRecord {
        return {
            ...record,
            sign_in: api.datetime.parse(record.sign_in),
            sign_out: api.datetime.parse(record.sign_out),
        };
    }

    async function fetch(skip = false) {
        if (!skip) await fetchStudents();
        const res = await api.roster.record.query.many();

        if (!res.data) return api.error(res.error, res.response);

        for (const r of Object.values(res.data.records)) {
            await replicate({ operation: "INSERT", ...r }, true);
        }

        triggerRef(data);
    }

    async function replicate(repl: ReplicationRecord, setup = false) {
        switch (repl.operation) {
            case "INSERT": {
                const r1 = fromraw(repl);

                const student = data.value.get(r1.sid_hashed);
                if (!student) {
                    if (setup) return;
                    else return await fetch();
                }

                const date = r1.sign_in
                    .withTimeZone(Temporal.Now.timeZoneId())
                    .toPlainDate();

                student.cells ??= [];
                let cell = student.cells.find((cc) => cc.date.equals(date));

                if (!cell) {
                    const c = { date, records: [] };
                    const i = student.cells.findIndex(
                        (cc) => cc.date.until(date).total("milliseconds") < 0,
                    );

                    if (i === -1) student.cells.push(c);
                    else student.cells.splice(i, 0, c);

                    cell = c;
                }

                const i = cell.records.findIndex(
                    (rr) =>
                        rr.sign_in.until(r1.sign_in).total("milliseconds") < 0,
                );

                if (i === -1) cell.records.push(r1);
                else cell.records.splice(i, 0, r1);

                break;
            }
            case "UPDATE": {
                const r0 = data.value
                    .values()
                    .flatMap((s) => s.cells ?? [])
                    .flatMap((c) => c.records)
                    .find((r) => r.id === repl.id);

                if (!r0) return await fetch();

                const saferepl = null2undefined(repl);

                const r1 = safeassign(r0, {
                    ...saferepl,
                    sign_in: api.datetime.parse(saferepl.sign_in),
                    sign_out: api.datetime.parse(saferepl.sign_out),
                });

                const s0 = data.value.get(r0.sid_hashed);

                // remove from old student, if applicable
                if (
                    !!repl.sid_hashed &&
                    r0.sid_hashed !== repl.sid_hashed &&
                    s0
                ) {
                    s0.cells ??= [];

                    const d0 = r0.sign_in
                        .withTimeZone(Temporal.Now.timeZoneId())
                        .toPlainDate();
                    const c0 = s0.cells.find((c) => c.date.equals(d0))!;
                    const i0 = c0.records.findIndex((r) => r.id === r0.id);
                    c0.records.splice(i0, 1);

                    // add to new student
                    const s1 = data.value.get(repl.sid_hashed);
                    const c1 = s1?.cells?.find((c) => c.date.equals(d0));
                    const i1 = c1?.records.findIndex((rr) => {
                        return (
                            rr.sign_in.until(r1.sign_in).total("milliseconds") >
                            0
                        );
                    });

                    if (!s1 || !c1 || i1 === undefined) return await fetch();

                    if (i1 === -1) c1.records.push(r1);
                    else c1.records.splice(i1, 0, r1);
                    break;
                }

                safemut(r0, r1);
                break;
            }
            case "DELETE": {
                const r0 = data.value
                    .values()
                    .flatMap((s) => s.cells ?? [])
                    .flatMap((c) => c.records)
                    .find((rr) => rr.id === repl.pkey);

                if (!r0) return await fetch();

                const s0 = data.value.get(r0.sid_hashed);
                if (!s0) return await fetch();

                s0.cells ??= [];
                const d0 = r0.sign_in
                    .withTimeZone(Temporal.Now.timeZoneId())
                    .toPlainDate();
                const c0 = s0.cells.find((c) => c.date.equals(d0));
                const i0 = c0?.records.findIndex((r) => r.id === r0.id);

                if (!c0 || i0 === undefined || i0 === -1) return await fetch();
                c0.records.splice(i0, 1);
                break;
            }
        }

        if (!setup) triggerRef(data);
    }

    const pool = useSSE();
    const connect = () => {
        connected.value = true;
        pool.add(api.roster.record.stream, replicate);
    };

    pool.onDisconnect(() => (connected.value = false));
    connect();

    return {
        connected: readonly(connected),
        reconnect: connect,
        data,
    };
}
