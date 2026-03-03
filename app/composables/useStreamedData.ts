import type { ShallowRef } from "vue";
import { toast } from "vue-sonner";
import type { ApiToastOptions } from "~/plugins/api";
import type {
    Admin,
    Event,
    EventTypeFilter,
    QueryFilter,
    ReplicationAdmin,
    ReplicationStudent,
    Student,
    TelemetryEvent,
} from "~/utils/api";
import api from "~/utils/api";
import { useCreds } from "./useAuth";
import { useSSE } from "./useSSE";

export interface UseDataOptions {
    onDenied?: () => void;
    onInit?: () => void;
    fetch?: Partial<ApiToastOptions>;
}

export function useStudentData({
    onDenied,
    onInit,
    fetch: fetchOptions,
}: UseDataOptions = {}) {
    const creds = useCreds();
    const crypto = useCrypto();

    const students = shallowRef(new Map<string, Student>());
    const store: ReplicationStudent[] = [];

    async function fetch(): Promise<unknown> {
        const res = await api.student.list();
        if (!res.data) return api.error(res.error, res.response, fetchOptions);

        const data = res.data.students;
        const ifle = data.flatMap((s) => [s.id, s.first, s.last]);
        const ifld = await crypto.decrypt(ifle, hex.asbytes(creds.value!.k1));

        if (!ifld) return toast.error("Failed to decrypt student data");
        students.value.clear();

        for (let i = 0; i < data.length; i++) {
            let ix = i * 3;
            let id_hashed = data[i]!.id_hashed;
            let id = ifld[ix]!;
            let first = ifld[ix + 1]!;
            let last = ifld[ix + 2]!;

            students.value.set(id_hashed, {
                id_hashed,
                id,
                first,
                last,
            });
        }

        triggerRef(students);
    }

    async function replicate(repl: ReplicationStudent) {
        if (!creds.value) return store.push(repl);
        const k1 = hex.asbytes(creds.value.k1);

        switch (repl.operation) {
            case "INSERT": {
                const { id, first, last } = repl;
                const [id2, first2, last2] =
                    (await crypto.decrypt([id, first, last], k1)) ?? [];

                if (!id2 || !first2 || !last2) return fetch();

                students.value.set(repl.id_hashed, {
                    id_hashed: repl.id_hashed,
                    id: id2,
                    first: first2,
                    last: last2,
                });

                break;
            }
            case "UPDATE": {
                const student = students.value.get(repl.id_hashed);
                if (!student) return fetch();

                const { id, first, last } = repl;
                const [id2] = id
                    ? ((await crypto.decrypt([id], k1)) ?? [null])
                    : [undefined];
                const [first2] = first
                    ? ((await crypto.decrypt([first], k1)) ?? [null])
                    : [undefined];
                const [last2] = last
                    ? ((await crypto.decrypt([last], k1)) ?? [null])
                    : [undefined];

                if (id2 === null || first2 === null || last2 === null)
                    return fetch();

                safeassign(student, {
                    id: id2,
                    first: first2,
                    last: last2,
                });

                break;
            }
            case "DELETE": {
                const success = students.value.delete(repl.pkey);
                if (!success) return fetch();
                break;
            }
        }

        triggerRef(students);
    }

    watch(
        creds,
        async (creds) => {
            if (!creds) return;
            if (!creds.claims.perms.student_view) return onDenied?.();
            if (students.value.size !== 0) return;

            await fetch();
            useSSE().add(api.student.stream, replicate);
            onInit?.();
        },
        { immediate: true },
    );

    return { students, reload: fetch };
}

export function studentNames(students: ShallowRef<Map<string, Student>>) {
    return computed(() => {
        const names = {} as Record<string, string>;

        for (const student of students.value.values()) {
            names[student.id_hashed] = `${student.first} ${student.last}`;
        }

        return names;
    });
}

export function useAdminData({
    onDenied,
    onInit,
    fetch: fetchOptions,
}: UseDataOptions = {}) {
    const creds = useCreds();

    const admins = shallowRef(new Map<string, Admin>());
    const store: ReplicationAdmin[] = [];

    async function fetch(): Promise<unknown> {
        const res = await api.admin.query.many();
        if (!res.data) return api.error(res.error, res.response, fetchOptions);

        const data = Object.values(res.data.admins);
        admins.value.clear();

        for (const admin of data) {
            admins.value.set(admin.id, admin);
        }

        triggerRef(admins);
    }

    async function replicate(repl: ReplicationAdmin) {
        if (!creds.value) return store.push(repl);

        switch (repl.operation) {
            case "INSERT": {
                admins.value.set(repl.id, repl);

                break;
            }
            case "UPDATE": {
                const admin = admins.value.get(repl.id);
                if (!admin) return fetch();

                safeassign(admin, repl);
                break;
            }
            case "DELETE": {
                const success = admins.value.delete(repl.pkey);
                if (!success) return fetch();
                break;
            }
        }

        triggerRef(admins);
    }

    watch(
        creds,
        async (creds) => {
            if (!creds) return;
            if (!creds.claims.perms.student_view) return onDenied?.();
            if (admins.value.size !== 0) return;

            await fetch();
            useSSE().add(api.admin.stream, replicate);
            onInit?.();
        },
        { immediate: true },
    );

    return { admins, reload: fetch };
}

export function adminUsernames(admins: ShallowRef<Map<string, Admin>>) {
    return computed(() => {
        const names = {} as Record<string, string>;

        for (const admin of admins.value.values()) {
            names[admin.id] = admin.username;
        }

        return names;
    });
}

export interface UseTelemetryOptions extends UseDataOptions {
    init: QueryFilter;
    event?: EventTypeFilter;
}

export function useTelemetry({
    onDenied,
    onInit,
    fetch: fetchOptions,
    init,
    event,
}: UseTelemetryOptions) {
    const creds = useCreds();
    const events = shallowRef([] as TelemetryEvent[]);
    const filter = ref("");

    async function fetch(): Promise<string | void> {
        const search = await api.telemetry.search({
            body: {
                query: init,
                event_type: event,
            },
        });

        if (!search.data)
            return api.error(search.error, search.response, fetchOptions);

        const data = Object.values(search.data.events);
        events.value = [];

        for (const evt of data) {
            events.value.push(evt);
        }

        if (!filter.value) {
            const res = await api.telemetry.filter.create({
                body: event ?? (null as any),
            });

            if (res.data === undefined)
                return api.error(res.error, res.response, fetchOptions);
            filter.value = res.data;
        }

        triggerRef(events);

        return filter.value;
    }

    function add(repl: TelemetryEvent) {
        events.value.push(repl);
        triggerRef(events);
    }

    watch(
        creds,
        async (creds) => {
            if (!creds) return;
            if (!creds.claims.perms.telemetry) return onDenied?.();
            if (events.value.length !== 0) return;

            const id = await fetch();

            if (!id) return;

            useSSE().add(() => {
                return api.telemetry.stream({
                    query: { id },
                });
            }, add);
            onInit?.();
        },
        { immediate: true },
    );

    return {
        events: events,
        reload: fetch,
        update: async (nf: EventTypeFilter | undefined) => {
            event = nf;

            if (filter.value) {
                const res = await api.telemetry.filter.update({
                    query: { id: filter.value },
                    body: nf ?? (null as any),
                });

                if (res.error)
                    return api.error(res.error, res.response, fetchOptions);
            }

            await fetch();
        },
    };
}
