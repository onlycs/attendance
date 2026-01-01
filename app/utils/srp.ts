import { createVerifierAndSalt, SRPClientSession, SRPParameters, SRPRoutines } from "tssrp6a";
import type { LoginStartResponse } from "./api";

const routines = new SRPRoutines(
    new SRPParameters(
        SRPParameters.PrimeGroup[2048],
        SRPParameters.H.SHA512,
    ),
);

export const srp = {
    session(): SRPClientSession {
        return new SRPClientSession(routines);
    },

    async register(username: string, password: string) {
        return await createVerifierAndSalt(routines, username, password);
    },

    async login({ salt, b }: LoginStartResponse, username: string, password: string) {
        const sessionA = this.session();
        const sessionB = await sessionA.step1(username, password);
        const sessionC = await sessionB.step2(hex.into(salt), hex.into(b));
        return sessionC;
    },
};
