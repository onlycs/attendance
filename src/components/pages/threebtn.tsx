import { FocusCards } from "@ui/focus-cards";
import { useAnimationControls } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import React, { useEffect, useImperativeHandle } from "react";

export interface Target {
	title: string;
	icon: ReactNode;
	onClick?: () => void;
	link?: string;
}

const CardAnim = {
	variants: {
		above: { y: "-90vh", scale: 0.5, opacity: 0 },
		center: { y: 0, scale: 1, opacity: 1 },
		below: { y: "90vh", scale: 0.5, opacity: 0 },
		hover: { scale: 1.05, y: -10, transition: { duration: 0.1 } },
	},

	initial: "above",
	whileInView: "center",
	whileHover: "hover",
	transition: { duration: 0.25, ease: "easeInOut" },
};

const CardAnimInv = {
	...CardAnim,
	initial: "below",
};

export interface ThreeBtnProps {
	targets: Target[];
}

export interface ThreeBtnRef {
	outbound: (url: string) => void;
}

export const ThreeBtn = React.forwardRef<ThreeBtnRef, ThreeBtnProps>(
	({ targets }, ref) => {
		const router = useRouter();

		const fwdController = useAnimationControls();
		const bwdController = useAnimationControls();

		// biome-ignore lint/correctness/useExhaustiveDependencies: router is not a dependency
		useEffect(() => {
			for (const target of targets) {
				if (!target.link) continue;
				router.prefetch(target.link);
			}
		}, []);

		// biome-ignore lint/correctness/useExhaustiveDependencies: animation controllers are not dependencies
		useEffect(() => {
			fwdController.start("center").catch(console.error);
			bwdController.start("center").catch(console.error);
		}, []);

		useImperativeHandle(ref, () => ({
			outbound: (url: string) => {
				fwdController.set("center");
				bwdController.set("center");

				fwdController.start("below").catch(console.error);
				bwdController.start("above").catch(console.error);

				setTimeout(() => {
					fwdController.set("below");
					bwdController.set("above");

					router.push(url);
				}, CardAnim.transition.duration * 1000);
			},
		}));

		const outbound = (url: string) => {
			fwdController.set("center");
			bwdController.set("center");
			fwdController.start("below").catch(console.error);
			bwdController.start("above").catch(console.error);
			setTimeout(() => {
				router.push(url);
			}, CardAnim.transition.duration * 1000);
		};

		const fwdAnim = {
			...CardAnim,
			animate: fwdController,
		};

		const bwdAnim = {
			...CardAnimInv,
			animate: bwdController,
		};

		return (
			<FocusCards
				cards={targets.map((target, index) => {
					return {
						...target,
						motion: index === 1 ? bwdAnim : fwdAnim,
						onClick: () => {
							target.onClick?.();
							if (target.link) {
								outbound(target.link);
							}
						},
					};
				})}
			/>
		);
	},
);

ThreeBtn.displayName = "ThreeBtn";
