function toUint8Array(str: string): Uint8Array {
	return new TextEncoder().encode(str);
}

async function derkey(password: string, salt: Uint8Array) {
	const material = await crypto.subtle.importKey(
		"raw",
		toUint8Array(password),
		"PBKDF2",
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt,
			iterations: 100_000,
			hash: "SHA-256",
		},
		material,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export async function encrypt(text: string, password: string) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await derkey(password, salt);

	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		toUint8Array(text),
	);

	const result = new Uint8Array([...salt, ...iv, ...new Uint8Array(encrypted)]);
	return btoa(String.fromCharCode(...result));
}

export async function decrypt(encrypted: string, password: string) {
	const data = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
	const salt = data.slice(0, 16);
	const iv = data.slice(16, 16 + 12);
	const cipher = data.slice(16 + 12);

	const key = await derkey(password, salt);
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		cipher,
	);

	return new TextDecoder().decode(decrypted);
}
