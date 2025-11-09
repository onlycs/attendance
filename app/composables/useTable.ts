import { toast } from "vue-sonner";
import z from "zod";
import { makeWebsocket } from "~/utils/zodws/api";
import type {
    EntryFieldUpdateSchema,
    ReplicationIncoming,
    ReplicationOutgoing,
    StudentFieldUpdateSchema,
} from "~/utils/zodws/schema/replicate";
import type { Cell } from "~/utils/zodws/schema/table";

export interface Student {
    id: string;
    hashed: string;
    first: string;
    last: string;
    cells: Cell[];
}

interface TableProps {
    auth: AuthState;
    router: ReturnType<typeof useRouter>;
    loading: Ref<boolean>;
}

export function useTable({ auth, router, loading }: TableProps) {
    const creds = computed(() => {
        const admin = auth.admin.value;
        return admin.status === "ok" ? admin : undefined;
    });

    const data: Student[] = [];
    const applied: ReplicationOutgoing[] = [];
    const unapplied: ReplicationOutgoing[] = [];
    const update = ref(0);
    const ready = {
        ok: ref(false),
        task: ref("Connecting"),
        progress: ref(0),
        progressmax: ref(2),
    };

    async function apply(
        repl: ReplicationIncoming,
        bucket: ReplicationOutgoing[] = applied,
        clearRedo: boolean = true,
    ) {
        async function inner(
            repl: ReplicationIncoming,
            bucket: ReplicationOutgoing[] = applied,
            clearRedo: boolean = true,
        ) {
            const cryptkey = creds.value?.password.value;
            if (!cryptkey) return;

            if (clearRedo) {
                unapplied.splice(0, unapplied.length);
            }

            if (repl.type === "Full") {
                ready.task.value = "Decrypting student data";
                ready.progress.value = 0;
                ready.progressmax.value = repl.data.length * 3;

                const incoming = repl.data.map(async (row) => {
                    const id = await Crypt.decrypt(row.student.id, cryptkey);
                    ready.progress.value += 1;

                    const first = await Crypt.decrypt(
                        row.student.first,
                        cryptkey,
                    );
                    ready.progress.value += 1;

                    const last = await Crypt.decrypt(
                        row.student.last,
                        cryptkey,
                    );
                    ready.progress.value += 1;

                    return {
                        id,
                        hashed: row.student.hashed,
                        first,
                        last,
                        cells: row.cells,
                    };
                });

                const students = await Promise.all(incoming);
                data.splice(0, data.length, ...students);

                ready.ok.value = true;
                return;
            }

            if (repl.type === "AddStudent") {
                const id = await Crypt.decrypt(repl.student.id, cryptkey);
                const first = await Crypt.decrypt(repl.student.first, cryptkey);
                const last = await Crypt.decrypt(repl.student.last, cryptkey);

                data.push({
                    id,
                    hashed: repl.student.hashed,
                    first,
                    last,
                    cells: repl.cells,
                });

                bucket.push({
                    type: "DeleteStudent",
                    hashed: repl.student.hashed,
                });

                return;
            }

            if (repl.type === "UpdateStudent") {
                const student = data.find((s) => s.hashed === repl.hashed);
                if (!student) return;

                const undos: z.output<typeof StudentFieldUpdateSchema>[] = [];
                const incoming = repl.updates;

                for (const update of incoming) {
                    if (update.key === "first") {
                        undos.push({
                            key: "first",
                            value: student.first,
                        });
                        student.first = update.value;
                    } else if (update.key === "last") {
                        undos.push({
                            key: "last",
                            value: student.last,
                        });
                        student.last = update.value;
                    }
                }

                if (undos.length > 0) {
                    bucket.push({
                        type: "UpdateStudent",
                        hashed: repl.hashed,
                        updates: undos,
                    });
                }

                return;
            }

            if (repl.type === "DeleteStudent") {
                const index = data.findIndex((s) => s.hashed === repl.hashed);
                if (index === -1) return;

                const removed = data.splice(index, 1)[0]!;

                bucket.push({
                    type: "AddStudent",
                    student: {
                        id: await Crypt.encrypt(removed.id, cryptkey),
                        hashed: removed.hashed,
                        first: await Crypt.encrypt(removed.first, cryptkey),
                        last: await Crypt.encrypt(removed.last, cryptkey),
                    },
                    cells: removed.cells,
                });

                return;
            }

            if (repl.type === "AddEntry") {
                const student = data.find((s) => s.hashed === repl.hashed);
                if (!student) return;

                let cell = student.cells.find((c) => c.date === repl.date);
                if (!cell) {
                    // insert into every student, sorted.
                    for (const s of data) {
                        const newCell = { date: repl.date, entries: [] };
                        const index = s.cells.findIndex(
                            (c) => c.date > repl.date,
                        );

                        if (index === -1) s.cells.push(newCell);
                        else s.cells.splice(index, 0, newCell);

                        if (s.hashed === repl.hashed) cell = newCell;
                    }

                    if (!cell) return;
                }

                cell.entries.push(repl.entry);
                bucket.push({
                    type: "DeleteEntry",
                    hashed: repl.hashed,
                    date: repl.date,
                    id: repl.entry.id,
                });

                return;
            }

            if (repl.type === "UpdateEntry") {
                const student = data.find((s) => s.hashed === repl.hashed);
                if (!student) return;

                const cell = student.cells.find((c) => c.date === repl.date);
                if (!cell) return;

                const entry = cell.entries.find((e) => e.id === repl.id);
                if (!entry) return;

                const undos = [] as z.output<typeof EntryFieldUpdateSchema>[];
                const incoming = repl.updates;

                for (const update of incoming) {
                    if (update.key === "kind") {
                        undos.push({
                            key: "kind",
                            value: entry.kind,
                        });
                        entry.kind = update.value;
                    } else if (update.key === "start") {
                        undos.push({
                            key: "start",
                            value: entry.start,
                        });
                        entry.start = update.value;
                    } else if (update.key === "end") {
                        undos.push({
                            key: "end",
                            value: entry.end,
                        });
                        entry.end = update.value;
                    }
                }

                if (undos.length > 0) {
                    bucket.push({
                        type: "UpdateEntry",
                        hashed: repl.hashed,
                        date: repl.date,
                        id: repl.id,
                        updates: undos,
                    });
                }

                return;
            }

            if (repl.type === "DeleteEntry") {
                const student = data.find((s) => s.hashed === repl.hashed);
                if (!student) return;

                const cell = student.cells.find((c) => c.date === repl.date);
                if (!cell) return;

                const index = cell.entries.findIndex((e) => e.id === repl.id);
                if (index === -1) return;

                const removed = cell.entries.splice(index, 1)[0]!;

                bucket.push({
                    type: "AddEntry",
                    hashed: repl.hashed,
                    date: repl.date,
                    entry: removed,
                });

                return;
            }
        }

        loading.value = true;
        await inner(repl, bucket, clearRedo);
        update.value++;
        loading.value = false;
    }

    const reconnect = ref(false);
    let attempts = 0;
    const timer = ref(0);

    function countdown(callback: () => void) {
        if (timer.value === 0) return callback();
        timer.value = timer.value - 1;

        setTimeout(() => countdown(callback), 1000);
    }

    const websocket = makeWebsocket({
        connect(sock) {
            ready.progress.value++;

            if (!creds.value) return;
            reconnect.value = false;
            attempts = 0;

            sock.send("Authenticate", {
                token: creds.value?.token.value.token,
            });
        },

        disconnect(sock) {
            if (attempts > 5) {
                reconnect.value = true;
                return toast.error("Timed out. Please reconnect manually.");
            }

            attempts += 1;
            timer.value = attempts * 5;

            toast.warning("Reconnecting\u2026", {
                duration: timer.value * 1000,
                description: defineComponent({
                    setup() {
                        const remaining = ref(timer.value);

                        watch(timer, (time) => {
                            remaining.value = time;
                        });

                        return { remaining };
                    },
                    render() {
                        return h("div", `\u2026in ${this.remaining} seconds`);
                    },
                }),
            });

            countdown(() => sock.reconnect());
        },

        messages: {
            Replicate(_, repl) {
                if (!ready.ok.value) ready.progress.value++;

                apply(repl).catch((err) => {
                    toast.error(`Failed to apply replication: ${err}`);
                    loading.value = false;
                });
            },

            Error(_, payload) {
                if (payload.meta.type === "Auth") {
                    auth.clear();
                    router.push("/?error=session-expired");
                }

                toast.error(payload.message);
            },
        },
    });

    function send(repl: ReplicationOutgoing) {
        if (!websocket.assert("connected")) {
            toast.error("Edits made while disconnected will NOT apply.");
            return;
        }

        websocket.send("Replicate", repl);
    }

    return {
        data: computedWithControl(update, () => data),
        ready,
        reconnect,
        send,
    };
}
