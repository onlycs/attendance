export const Timing = {
	in: {
		duration: 0.3,
		ease: "circ.out",
	},
	out: {
		ease: "circ.out",
		duration: 0.2,
	},
	offset: 0.1,
	fast: {
		in: {
			duration: 0.15,
			ease: "circ.out",
		},
		out: {
			ease: "circ.out",
			duration: 0.1,
		},
		offset: 0.05,
	},
	slow: {
		in: {
			duration: 0.4,
			ease: "circ.out",
		},
		out: {
			ease: "circ.out",
			duration: 0.3,
		},
		offset: 0.15,
	},
} as const;

export const PreTranslateOffset = 20; // in rem
