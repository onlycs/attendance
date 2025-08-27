import { z } from "zod";
import { API_URL, HourTypeSchema } from "../api";
import {
	makeApi,
	makeClientMsg,
	makeServerMsg,
	type WsClientHooks,
	ZodWsClient,
} from "./lib";

export const WS_URL = `${API_URL.replaceAll("http", "ws")}/ws`;

const Subscription = z.enum(["StudentData", "Editor"]);

const Subscribe = makeClientMsg({
	name: "Subscribe",
	schema: z.object({
		token: z.string(),
		sub: Subscription,
	}),
});

const UpdateStudentData = z.object({
	sub: z.literal("StudentData"),
	value: z.string(),
});

const UpdateEditor = z.object({
	sub: z.literal("Editor"),
	value: z
		.object({
			type: z.literal("Create"),
			studentId: z.string(),
			sign_in: z.date().transform((d) => d.toISOString()),
			sign_out: z
				.date()
				.transform((d) => d.toISOString())
				.optional(),
			hour_type: HourTypeSchema,
		})
		.or(
			z.object({
				type: z.literal("Update"),
				entryId: z.string(),
				signIn: z.date().transform((d) => d.toISOString()),
				signOut: z
					.date()
					.transform((d) => d.toISOString())
					.optional(),
				hourType: HourTypeSchema,
			}),
		)
		.or(
			z.object({
				type: z.literal("Delete"),
				entryId: z.string(),
			}),
		)
		.transform((value) => JSON.stringify(value)),
});

const Update = makeClientMsg({
	name: "Update",
	schema: UpdateStudentData.or(UpdateEditor),
});

const StudentDataResponse = makeServerMsg({
	name: "StudentData",
	schema: z.string(),
});

const ErrorSchema = z.object({
	type: z.enum(["Serde", "Sqlx", "Closed", "Send", "Auth"]),
	source: z.string().optional(),
	location: z.string().optional(),
});

const ErrorResponse = makeServerMsg({
	name: "Error",
	schema: z.object({
		message: z.string(),
		meta: ErrorSchema,
	}),
});

const EditorTimeEntrySchema = z.object({
	id: z.string(),
	kind: HourTypeSchema,
	start: z.coerce.date(),
	end: z.coerce.date().optional(),
});

const EditorCellSchema = z.object({
	date: z.string().transform((d) => new Date(`${d}T00:00:00`)), // fucking timezones (insert relevant xkcd)
	entries: z.array(EditorTimeEntrySchema),
});

const RowSchema = z.object({
	id: z.string(),
	dates: z.array(EditorCellSchema),
});

export const EditorDataSchema = z.preprocess(
	(val) => {
		if (typeof val === "string") {
			return new Map(Object.entries(JSON.parse(val)));
		} else {
			return new Map(Object.entries(val as Record<string, unknown>));
		}
	},
	z.map(z.string(), RowSchema),
);

const EditorDataResponse = makeServerMsg({
	name: "EditorData",
	schema: EditorDataSchema,
});

const Api = makeApi({
	clientMsgs: [Subscribe, Update],
	serverMsgs: [StudentDataResponse, EditorDataResponse, ErrorResponse],
});

export const makeWebsocket = (hooks: WsClientHooks<typeof Api>) =>
	new ZodWsClient(Api, WS_URL, hooks);
