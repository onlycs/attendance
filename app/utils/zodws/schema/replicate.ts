import z from "zod";
import { StudentDataSchema } from "~/utils/api";
import { CellSchema, EntrySchema, NaiveDate } from "./table";

export const AddEntrySchema = z.object({
    type: z.literal("AddEntry"),
    hashed: z.string(),
    date: NaiveDate,
    entry: EntrySchema,
});

export const NewEntrySchema = AddEntrySchema.omit({ entry: true }).extend({
    entry: EntrySchema.omit({ id: true }),
});

export const EntryFieldUpdateSchema = z.union([
    z.object({ key: z.literal("kind"), value: EntrySchema.shape.kind }),
    z.object({ key: z.literal("start"), value: EntrySchema.shape.start }),
    z.object({ key: z.literal("end"), value: EntrySchema.shape.end }),
]);

export const UpdateEntrySchema = z.object({
    type: z.literal("UpdateEntry"),
    hashed: z.string(),
    date: NaiveDate,
    id: z.string(),
    updates: z.array(EntryFieldUpdateSchema),
});

export const DeleteEntrySchema = z.object({
    type: z.literal("DeleteEntry"),
    hashed: z.string(),
    date: NaiveDate,
    id: z.string(),
});

export const AddStudentSchema = z.object({
    type: z.literal("AddStudent"),
    student: StudentDataSchema,
});

export const StudentFieldUpdateSchema = z.union([
    z.object({ key: z.literal("first"), value: StudentDataSchema.shape.first }),
    z.object({ key: z.literal("last"), value: StudentDataSchema.shape.last }),
]);

export const UpdateStudentSchema = z.object({
    type: z.literal("UpdateStudent"),
    hashed: z.string(),
    updates: z.array(StudentFieldUpdateSchema),
});

export const DeleteStudentSchema = z.object({
    type: z.literal("DeleteStudent"),
    hashed: z.string(),
});

export const FullUpdateSchema = z.object({
    type: z.literal("Full"),
    data: z.array(
        z.object({
            student: StudentDataSchema,
            cells: z.array(CellSchema),
        }),
    ),
});

export const IncomingReplicationSchema = z.union([
    AddEntrySchema,
    UpdateEntrySchema,
    DeleteEntrySchema,
    AddStudentSchema,
    UpdateStudentSchema,
    DeleteStudentSchema,
    FullUpdateSchema,
]);

export const OutgoingReplicationSchema = z.union([
    NewEntrySchema,
    UpdateEntrySchema,
    DeleteEntrySchema,
    AddStudentSchema,
    UpdateStudentSchema,
    DeleteStudentSchema,
]);

export const ReplicateIncoming = narrow({
    name: "Replicate",
    schema: IncomingReplicationSchema,
});

export const ReplicateOutgoing = narrow({
    name: "Replicate",
    schema: OutgoingReplicationSchema,
});

export type ReplicationIncoming = z.output<typeof IncomingReplicationSchema>;
export type ReplicationOutgoing = z.output<typeof OutgoingReplicationSchema>;
