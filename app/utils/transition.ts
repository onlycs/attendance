export interface TransitionOptions {
	reverse?: boolean;
	timing?: SingleTiming;
}

export interface TransitionControls {
	out: {
		begun: Ref<boolean>;
		complete: Ref<boolean>;
		trigger: (options?: TransitionOptions) => Promise<void>;
	};
	in: {
		begun: Ref<boolean>;
		complete: Ref<boolean>;
		trigger: (options?: TransitionOptions) => Promise<void>;
	};
}

export interface TransitionExtras {
	ready: Ref<boolean>;
	setup: Ref<boolean>;
}

export function provideTransition(controls: TransitionControls) {
	provide("transitions" as const, controls);
}

export function injectTransition(): TransitionControls & TransitionExtras {
	const controls = inject("transitions") as TransitionControls;

	return {
		ready: computedWithControl(
			[controls.in.complete, controls.out.begun],
			() => controls.in.complete.value && !controls.out.begun.value,
		),
		setup: controls.in.begun,
		...controls,
	};
}
