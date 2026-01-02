export const OldCrypto = {
    bufferize(str: string): Uint8Array<ArrayBuffer> {
        return new TextEncoder().encode(str);
    },

    unbufferize(buf: AllowSharedBufferSource): string {
        return new TextDecoder().decode(buf);
    },

    async derkey(password: string, salt: Uint8Array<ArrayBuffer>) {
        const material = await crypto.subtle.importKey(
            "raw",
            OldCrypto.bufferize(password),
            "PBKDF2",
            false,
            ["deriveKey"],
        );

        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 600_000,
                hash: "SHA-256",
            },
            material,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"],
        );
    },

    async decrypt(encrypted: string, password: string) {
        const data = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 16 + 12);
        const cipher = data.slice(16 + 12);

        const key = await OldCrypto.derkey(password, salt);
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            cipher,
        );

        return new TextDecoder().decode(decrypted);
    },
};
