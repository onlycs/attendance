'use client';

import { HomeButton } from '@ui/homebutton';
import { TransitionOutContext } from '@lib/transitions';

import React from 'react';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, useAnimationControls } from 'framer-motion';
import { BackgroundAnimationContext } from '@lib/background';

export default function Template({ children }: { children: React.ReactNode }) {
	const controls = useAnimationControls();
	const pathname = usePathname();
	const query = useSearchParams();

	useEffect(() => {
		controls.start({
			opacity: 1,
			x: 0
		});
	});

	const transitionOut = (callback: () => void) => {
		controls.start({
			opacity: 0,
			x: -100,
		}).then(callback);
	};

	const background = (color: string) => {
		controls.start({
			backgroundColor: `var(--${color})`
		}).then(console.log);
	};

	return (
		<TransitionOutContext.Provider
			value={transitionOut}
			key={`${pathname}${query}`}
		>
			<BackgroundAnimationContext.Provider value={background}>
				{pathname == '/' || pathname == undefined ? null : <HomeButton />}

				<motion.div
					initial={{
						opacity: 0,
						x: 100
					}}
					animate={controls}
					transition={{
						ease: 'easeInOut',
						duration: 0.5
					}}
					className="flex flex-row items-center justify-center h-screen bg-background"
				>
					{children}
				</motion.div>
			</BackgroundAnimationContext.Provider>
		</TransitionOutContext.Provider>
	);
}