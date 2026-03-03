import type { Student } from "~/utils/api";
import api from "~/utils/api";

export const TELEMETRY_DATE_FMT: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
};

export const datefmt = ornullable((apistr: string) => {
    return api.datetime
        .parse(apistr)
        .toLocaleString("en-US", TELEMETRY_DATE_FMT);
});

export const studentName = ornullable((student: Student) => {
    return student ? `${student.first} ${student.last}` : "Unknown Student";
});

export async function telemetryAdmin(id: string, denied: Ref<boolean>) {
    const admin = await api.admin.query.one({ path: { id } });
    denied.value = !admin.data;

    return admin.data;
}

export const decryptedStudent = (
    creds: Ref<AdminCreds | null>,
    crypto: WasmCrypto,
    sid_hashed: string | null | undefined,
    denied: Ref<boolean> = ref(false),
) => {
    const student = ref<Student | null>(null);

    watch(
        creds,
        async (creds) => {
            if (!creds) return;
            if (!sid_hashed) return;

            const res = await api.student.query({
                path: { id_hashed: sid_hashed },
            });

            if (!res.data) denied.value = true;
            else student.value = res.data ?? null;

            if (student.value) {
                const decrypted = await crypto.decrypt(
                    [student.value.id, student.value.first, student.value.last],
                    hex.asbytes(creds.k1),
                );

                if (decrypted) {
                    student.value.id = decrypted[0];
                    student.value.first = decrypted[1];
                    student.value.last = decrypted[2];
                }
            }
        },
        { immediate: true },
    );

    return student;
};

export const decryptFields = (
    creds: Ref<AdminCreds | null>,
    crypto: WasmCrypto,
    fields: string[],
) => {
    const values = ref<string[]>(fields.map(() => ""));

    watch(
        creds,
        async (creds) => {
            if (!creds) return;

            const decrypted = await crypto.decrypt(
                fields,
                hex.asbytes(creds.k1),
            );

            if (decrypted) values.value = decrypted;
        },
        { immediate: true },
    );

    return values;
};
