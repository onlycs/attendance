import { makeErrors } from "@zodios/core";
import { z } from "zod";

export const ApiErrors = makeErrors([
	{
		status: 401,
		schema: z.string(),
	},
	{
		status: 400,
		schema: z.string(),
	},
	{
		status: 404,
		schema: z.never(),
	},
	{
		status: 500,
		schema: z.string(),
	},
]);
