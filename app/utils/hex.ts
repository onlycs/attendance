export class hex {
    static from(number: bigint): string;
    static from(bytes: Uint8Array): string;
    static from(input: bigint | Uint8Array): string {
        if (typeof input === "bigint") {
            const s = input.toString(16);
            return s.length % 2 === 1 ? `0${s}` : s;
        } else {
            return Array.from(input)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
        }
    }

    static into(hex: string): bigint {
        return BigInt(`0x${hex}`);
    }
}
