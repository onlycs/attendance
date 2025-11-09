import z from "zod";

export const AuthenticateMessage = narrow({
    name: "Authenticate",
    schema: z.object({
        token: z.string(),
    }),
});
