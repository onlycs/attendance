import sha256 from "crypto-js/sha256";
import cuid2 from "cuid";

export const Crypt = {
	toUint8Array(str: string): Uint8Array<ArrayBuffer> {
		return new TextEncoder().encode(str);
	},

	async derkey(password: string, salt: Uint8Array<ArrayBuffer>) {
		const material = await crypto.subtle.importKey(
			"raw",
			Crypt.toUint8Array(password),
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

	async encrypt(text: string, password: string) {
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const key = await Crypt.derkey(password, salt);

		const encrypted = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv: iv },
			key,
			Crypt.toUint8Array(text),
		);

		const result = new Uint8Array([
			...salt,
			...iv,
			...new Uint8Array(encrypted),
		]);
		return btoa(String.fromCharCode(...result));
	},

	async decrypt(encrypted: string, password: string) {
		const data = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
		const salt = data.slice(0, 16);
		const iv = data.slice(16, 16 + 12);
		const cipher = data.slice(16 + 12);

		const key = await Crypt.derkey(password, salt);
		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: iv },
			key,
			cipher,
		);

		return new TextDecoder().decode(decrypted);
	},

	sha256(text: string) {
		return sha256(text).toString();
	},

	cuid() {
		return cuid2();
	},

	hex(number: bigint) {
		const s = number.toString(16);

		if (s.length % 2 === 1) return `0${s}`;
		return s;
	},

	fromHex(hex: string) {
		return BigInt(`0x${hex}`);
	},
};
