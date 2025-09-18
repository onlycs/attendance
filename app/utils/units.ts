export const Convert = {
	remToPx: (rem: number) => {
		let factor: number;

		try {
			factor = parseFloat(
				getComputedStyle?.(document?.documentElement)?.fontSize ?? "16ox",
			);
		} catch {
			factor = 16;
		}

		return rem * factor;
	},
};
