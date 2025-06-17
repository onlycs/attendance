"use client";

import * as crypt from "@lib/crypt";
import { JsonDb, StudentData } from "@lib/jsondb";
import { None, type Option, Some } from "@lib/optional";
import {
	EncryptionKey,
	TokenKey,
	useRequireStorage,
	useSession,
} from "@lib/storage";
import { type EditorDataSchema, makeWebsocket } from "@lib/zodws/api";
import { useCookies } from "next-client-cookies";
import { useMemo, useState } from "react";
import sha256 from "sha256";
import { toast } from "sonner";
import type { z } from "zod";

export default function Page() {
	const cookies = useCookies();
	const { value: password } = useSession(EncryptionKey);
	const canLoad = useRequireStorage([
		{ key: TokenKey },
		{ key: EncryptionKey, type: "session", redirectTo: "/admin" },
	]);

	const [studentData, setStudentData] =
		useState<Option<JsonDb<typeof StudentData>>>(None);

	const [editorData, setEditorData] =
		useState<Option<z.TypeOf<typeof EditorDataSchema>>>(None);

	// biome-ignore lint/correctness/useExhaustiveDependencies: websocket is stable, no need to recreate
	const ws = useMemo(() => {
		const sock = makeWebsocket({
			messages: {
				StudentData: (_, data) => {
					if (!data) {
						setStudentData(Some(new JsonDb(StudentData, [])));
					} else {
						crypt
							.decrypt(data, password.unwrap("unknown"))
							.then((decrypted) =>
								setStudentData(
									Some(new JsonDb(StudentData, JSON.parse(decrypted || "[]"))),
								),
							)
							.catch(toast.error);
					}
				},
				EditorData: (_, data) => {
					setEditorData(Some(data));
				},
			},
		});

		sock.send("Subscribe", {
			token: cookies.get(TokenKey) ?? "unknown",
			sub: "StudentData",
		});

		sock.send("Subscribe", {
			token: cookies.get(TokenKey) ?? "unknown",
			sub: "Editor",
		});

		return sock;
	}, []);

	const data = useMemo<
		Option<
			| z.TypeOf<typeof EditorDataSchema>
			| { name: readonly [string, string | undefined, string] }
		>
	>(() => {
		if (!studentData.isSome() || !editorData.isSome()) return None;

		const table = [];

		for (const [studentId, data] of editorData.value.entries()) {
			const student = studentData.value.get({
				id: (id) => sha256(id) === studentId,
			});

			if (student.length === 0) continue;

			const row = {
				id: student[0].id,
				name: [student[0].first, student[0].mi, student[0].last] as const,
				dates: data.dates,
			};

			table.push(row);
		}

		table.sort((a, b) => a.name[2].localeCompare(b.name[2]));

		return Some(table);
	}, [studentData, editorData]);

	if (!canLoad) return <></>;

	return <>{JSON.stringify(data)}</>;
}
