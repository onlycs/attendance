import { Temporal } from "temporal-polyfill";
import { zPlainDate } from "temporal-zod";
import { z } from "zod";
import { API_URL, type HourType, HourTypeSchema } from "../api";
import { type WsClientHooks, ZodWsClient } from "./lib";

export const WS_URL = `${API_URL.replaceAll("http", "ws")}/ws`;

const Subscription = z.enum(["StudentData", "Editor"]);

const Subscribe = narrow({
	name: "Subscribe",
	schema: z.object({
		token: z.string(),
		sub: Subscription,
	}),
});

export const UpdateStudentDataSchema = z.object({
	sub: z.literal("StudentData"),
	value: z.string(),
});

export type UpdateStudentData = z.infer<typeof UpdateStudentDataSchema>;

const SignIn = z.coerce
	.date()
	.transform((date) => Temporal.Instant.fromEpochMilliseconds(date.getTime()))
	.transform((instant) => instant.toZonedDateTimeISO("America/New_York"));

const SignOut = z.preprocess((val) => val ?? undefined, SignIn.optional());
const NaiveDate = zPlainDate;

export const TimeEntrySchema = z.object({
	id: z.string(),
	kind: HourTypeSchema,
	start: SignIn,
	end: SignOut,
});

export type TimeEntry = z.infer<typeof TimeEntrySchema>;

export const TimeEntryUpdateSchema = z.union([
	z.object({
		type: z.literal("kind"),
		data: HourTypeSchema,
	}),
	z.object({
		type: z.literal("start"),
		data: SignIn,
	}),
	z.object({
		type: z.literal("end"),
		data: SignOut,
	}),
]);

export type TimeEntryUpdate = z.infer<typeof TimeEntryUpdateSchema>;

export type UpdateQuery =
	| {
			type: "Create";
			studentId: string;
			signIn: Temporal.ZonedDateTime;
			signOut?: Temporal.ZonedDateTime;
			hourType: HourType;
	  }
	| {
			type: "Update";
			id: string;
			updates: TimeEntryUpdate[];
	  }
	| {
			type: "Delete";
			id: string;
	  }
	| {
			type: "Batch";
			updates: UpdateQuery[];
	  };

export const UpdateQuerySchema: z.ZodType<UpdateQuery> = z.lazy(() => {
	return z.union([
		z.object({
			type: z.literal("Create"),
			studentId: z.string(),
			signIn: SignIn,
			signOut: SignOut,
			hourType: HourTypeSchema,
		}),
		z.object({
			type: z.literal("Update"),
			id: z.string(),
			updates: z.array(TimeEntryUpdateSchema),
		}),
		z.object({
			type: z.literal("Delete"),
			id: z.string(),
		}),
		z.object({
			type: z.literal("Batch"),
			updates: z.array(UpdateQuerySchema),
		}),
	]);
});

export const UpdateQueryMessageSchema = z.object({
	sub: z.literal("Editor"),
	value: UpdateQuerySchema,
});

export const CellSchema = z.object({
	date: NaiveDate,
	entries: z.preprocess(
		(val) => new Map(Object.entries(val as Record<string, TimeEntry>)),
		z.map(z.string(), TimeEntrySchema),
	),
});

export type Cell = z.infer<typeof CellSchema>;

export const RowSchema = z.object({
	id: z.string(),
	cells: z.array(CellSchema),
});

export type Row = z.infer<typeof RowSchema>;

export const ReplicateQuerySchema = z.union([
	z.object({
		type: z.literal("Full"),
		data: z.preprocess(
			(val) => new Map(Object.entries((val ?? {}) as Record<string, Row>)),
			z.map(z.string(), RowSchema),
		),
	}),
	z.object({
		type: z.literal("Create"),
		studentId: z.string(),
		date: NaiveDate,
		entry: TimeEntrySchema,
	}),
	z.object({
		type: z.literal("Update"),
		studentId: z.string(),
		date: NaiveDate,
		id: z.string(),
		updates: z.array(TimeEntryUpdateSchema),
	}),
	z.object({
		type: z.literal("Delete"),
		studentId: z.string(),
		date: NaiveDate,
		id: z.string(),
	}),
]);

export type ReplicateQuery = z.infer<typeof ReplicateQuerySchema>;

const Update = narrow({
	name: "Update",
	schema: z.union([UpdateQueryMessageSchema, UpdateStudentDataSchema]),
});

const StudentDataResponse = narrow({
	name: "StudentData",
	schema: z.string(),
});

const ErrorSchema = z.object({
	type: z.enum([
		"Serde",
		"Sqlx",
		"Closed",
		"Time",
		"Data",
		"Unknown",
		"Send",
		"Auth",
	]),
	source: z.string().optional(),
	location: z.string().optional(),
});

const ErrorResponse = narrow({
	name: "Error",
	schema: z.object({
		message: z.string(),
		meta: ErrorSchema,
	}),
});

const EditorDataResponse = narrow({
	name: "EditorData",
	schema: ReplicateQuerySchema,
});

const Api = narrow({
	client: [Subscribe, Update],
	server: [StudentDataResponse, EditorDataResponse, ErrorResponse],
});

export const makeWebsocket = (hooks: WsClientHooks<typeof Api>) =>
	new ZodWsClient(Api, WS_URL, hooks);
