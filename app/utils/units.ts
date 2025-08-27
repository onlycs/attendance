export const Convert = {
	remToPx: (rem: number) =>
		rem * parseFloat(getComputedStyle(document.documentElement).fontSize),
};
