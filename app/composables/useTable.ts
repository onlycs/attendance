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
}

export function useTable({ auth, router }: TableProps) {
    const creds = computed(() => {
        const admin = auth.admin.value;
        return admin.status === "ok" ? admin : undefined;
    });

    const data: Student[] = [];
    const update = ref(0);
    const ready = {
        ok: ref(false),
        task: ref("Connecting"),
        progress: ref(0),
        progressmax: ref(2),
    };

    async function apply(repl: ReplicationIncoming) {
        async function inner(repl: ReplicationIncoming) {
            const cryptkey = creds.value?.password.value;
            if (!cryptkey) return;

            if (repl.type === "Full") {
                ready.task.value = "Decrypting student data";
                ready.progressmax.value += repl.data.length * 3;

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
                    cells: data[0]?.cells.map((c) => ({ date: c.date, entries: [] })) || [],
                });

                return;
            }

            if (repl.type === "UpdateStudent") {
                const student = data.find((s) => s.hashed === repl.hashed);
                if (!student) return;

                const incoming = repl.updates;

                for (const update of incoming) {
                    if (update.key === "first") {
                        student.first = await Crypt.decrypt(
                            update.value,
                            cryptkey,
                        );
                    } else if (update.key === "last") {
                        student.last = await Crypt.decrypt(
                            update.value,
                            cryptkey,
                        );
                    }
                }

                return;
            }

            if (repl.type === "DeleteStudent") {
                const index = data.findIndex((s) => s.hashed === repl.hashed);
                if (index === -1) return;

                const removed = data.splice(index, 1)[0]!;

                return;
            }

            if (repl.type === "AddEntry") {
                const student = data.find((s) => s.hashed === repl.hashed);
                if (!student) return;

                let cell = student.cells.find((c) => c.date.equals(repl.date));
                if (!cell) {
                    // insert into every student, sorted.
                    for (const s of data) {
                        const newCell = { date: repl.date, entries: [] };
                        const index = s.cells.findIndex((c) => {
                            return (
                                c.date.until(repl.date).total("milliseconds")
                                    > 0
                            );
                        });

                        if (index === -1) s.cells.push(newCell);
                        else s.cells.splice(index, 0, newCell);

                        if (s.hashed === repl.hashed) cell = newCell;
                    }

                    if (!cell) return;
                }

                cell.entries.push(repl.entry);

                return;
            }

            if (repl.type === "UpdateEntry") {
                const student = data.find((s) => s.hashed === repl.hashed);
                if (!student) return;

                const cell = student.cells.find((c) => c.date.equals(repl.date));
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

                return;
            }

            if (repl.type === "DeleteEntry") {
                const student = data.find((s) => s.hashed === repl.hashed);
                if (!student) return;

                const cell = student.cells.find((c) => c.date.equals(repl.date));
                if (!cell) return;

                const index = cell.entries.findIndex((e) => e.id === repl.id);
                if (index === -1) return;

                cell.entries.splice(index, 1);

                return;
            }
        }

        await inner(repl);
        update.value++;
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

            const id = toast.warning("Reconnecting\u2026", {
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

            countdown(() => {
                toast.dismiss(id);
                sock.reconnect();
            });
        },

        messages: {
            Replicate(_, repl) {
                if (!ready.ok.value) ready.progress.value++;

                apply(repl).catch((err) => {
                    toast.error(`Failed to apply replication: ${err}`);
                    err.stack && console.error(err.stack);
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

    watch(auth.admin, admin => {
        if (admin.status === "ok") {
            websocket.send("Authenticate", {
                token: admin.token.value.token,
            });
        }
    });

    function send(repl: ReplicationOutgoing) {
        if (!websocket.assert("connected")) {
            toast.error("Edits made while disconnected will NOT apply.");
            return;
        }

        websocket.send("Replicate", repl);
    }

    onBeforeUnmount(() => {
        websocket.close();
    });

    return {
        data: computed(() => {
            update.value; // depend on update ref.
            return [...data];
        }),
        ready,
        reconnect,
        send,
        update,
    };
}
