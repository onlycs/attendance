import type { HourType, Permissions, TelemetryEvent } from "./hey/types.gen";

export const PermissionTitles: Record<keyof Permissions, string> = {
    student_add: "Add Students",
    student_delete: "Remove Students",
    student_view: "View Students",
    student_edit: "Edit Students",
    roster: "Start Attendance",
    admin_delete: "Delete Admins",
    admin_invite: "Invite Admins",
    admin_view: "View Admins",
    telemetry: "View Telemetry",
    hours_view: "View Hours",
    hours_edit: "Edit Hours",
    admin_edit: "Edit Admins",
};

export const HourTypeTitles: Record<HourType, string> = {
    build: "Build",
    learning: "Learning",
    demo: "Outreach",
    offseason: "Offseason",
};

export const EventTypeTitles = {
    invite_add: "New Invite",
    invite_use: "Invite Used",
    student_login: "Student Login",
    student_logout: "Student Logout",
    admin_login: "Admin Login",
    permission_edit: "Permissions",
    admin_edit: "Admin Edited",
    admin_delete: "Admin Removed",
    record_add: "New Record",
    record_edit: "Record Edited",
    record_delete: "Record Removed",
    student_add: "New Student",
    student_edit: "Student Edited",
    student_delete: "Student Removed",
} as const satisfies Record<TelemetryEvent["event"]["event"], string>;

export type EventType = keyof typeof EventTypeTitles;
