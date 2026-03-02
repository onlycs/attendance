import type { ApiClient } from "~/plugins/api";
import type { Permissions } from "./hey";

export type * from "./hey/types.gen";

export default new Proxy({}, {
    get: (_, prop) => {
        const { $api } = useNuxtApp();
        return ($api as any)[prop];
    },
}) as ApiClient;

export const PermissionTitles: Record<keyof Permissions, string> = {
    "student_add": "Add Students",
    "student_delete": "Remove Students",
    "student_view": "View Students",
    "student_edit": "Edit Students",
    "roster": "Start Attendance",
    "admin_delete": "Delete Admins",
    "admin_invite": "Invite Admins",
    "admin_view": "View Admins",
    "telemetry": "View Telemetry",
    "hours_view": "View Hours",
    "hours_edit": "Edit Hours",
    "admin_edit": "Edit Admins",
};
