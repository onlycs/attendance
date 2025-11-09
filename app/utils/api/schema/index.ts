import { makeApi } from "@zodios/core";

import * as auth from "./auth";
import * as roster from "./roster";
import * as student from "./student";

export * from "./auth";
export * from "./error";
export * from "./roster";
export * from "./student";

export const ApiSchema = makeApi([
    ...auth.AuthEndpoints,
    ...roster.RosterEndpoints,
    ...student.StudentEndpoints,
]);

export type Api = typeof ApiSchema;
