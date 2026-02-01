import type { ShallowRef } from "vue";
import { toast } from "vue-sonner";
import type { ReplicationStudent, Student } from "~/utils/api";
import api from "~/utils/api";
import { useCreds } from "./useAuth";
import { useSSE } from "./useSSE";

export interface StudentDataOptions {
    onDenied?: () => void;
    onInit?: () => void;
}

export function useStudentData({ onDenied, onInit }: StudentDataOptions = {}) {
    const creds = useCreds();
    const crypto = useCrypto();

    const students = shallowRef(new Map<string, Student>());
    const store: ReplicationStudent[] = [];

    async function fetch(): Promise<unknown> {
        const res = await api.student.list();
        if (!res.data) return api.error(res.error, res.response);

        const data = res.data.students;
        const ifle = data.flatMap(s => [s.id, s.first, s.last]);
        const ifld = await crypto.decrypt(ifle, hex.asbytes(creds.value!.k1));

        if (!ifld) return toast.error("Failed to decrypt student data");
        students.value.clear();

        for (let i = 0; i < data.length; i++) {
            let ix = i * 3;
            let id_hashed = data[i]!.id_hashed;
            let id = ifld[ix]!;
            let first = ifld[ix + 1]!;
            let last = ifld[ix + 2]!;

            students.value.set(
                id_hashed,
                {
                    id_hashed,
                    id,
                    first,
                    last,
                },
            );
        }

        triggerRef(students);
    }

    async function replicate(repl: ReplicationStudent) {
        if (!creds.value) return store.push(repl);
        const k1 = hex.asbytes(creds.value.k1);

        switch (repl.operation) {
            case "INSERT": {
                const { id, first, last } = repl;
                const [id2, first2, last2] = await crypto.decrypt([id, first, last], k1) ?? [];

                if (!id2 || !first2 || !last2) return fetch();

                students.value.set(
                    repl.id_hashed,
                    {
                        id_hashed: repl.id_hashed,
                        id: id2,
                        first: first2,
                        last: last2,
                    },
                );

                break;
            }
            case "UPDATE": {
                const student = students.value.get(repl.id_hashed);
                if (!student) return fetch();

                const { id, first, last } = repl;
                const [id2] = id ? await crypto.decrypt([id], k1) ?? [null] : [undefined];
                const [first2] = first ? await crypto.decrypt([first], k1) ?? [null] : [undefined];
                const [last2] = last ? await crypto.decrypt([last], k1) ?? [null] : [undefined];

                if (id2 === null || first2 === null || last2 === null) return fetch();

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

    watch(creds, async (creds) => {
        if (!creds) return;
        if (!creds.claims.perms.student_view) return onDenied?.();
        if (students.value.size !== 0) return;

        await fetch();
        useSSE().add(api.student.stream, replicate);
        onInit?.();
    }, { immediate: true });

    return { students, reload: fetch };
}

export function studentNames(students: ShallowRef<Map<string, Student>>) {
    // const names = shallowRef<Record<string, string>>({});

    // watch(students, (students) => {
    //     for (const student of students.values()) {
    //         names.value[student.id_hashed] = `${student.first} ${student.last}`;
    //     }

    //     triggerRef(names);
    // });
    //
    // return names;

    return computed(() => {
        const names = {} as Record<string, string>;

        for (const student of students.value.values()) {
            names[student.id_hashed] = `${student.first} ${student.last}`;
        }

        return names;
    });
}
