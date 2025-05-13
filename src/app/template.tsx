'use client';

import React from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { BackgroundAnimationContext } from '@lib/background';
import { Toaster } from '@ui/sonner';

export default function Template({ children }: { children: React.ReactNode }) {
    const controls = useAnimationControls();

    const background = (color: string) => {
        controls.start({
            backgroundColor: `var(--${color})`,
            transition: {
                duration: 0.5,
                ease: 'easeInOut',
            },
        }).catch(console.error);
    };

    return (
        <BackgroundAnimationContext.Provider value={background}>
            <motion.div animate={controls} className='flex flex-row w-full h-full items-center justify-center' data-vaul-drawer-wrapper=''>
                {children}
            </motion.div>
            <Toaster
                toastOptions={{
                    classNames: {
                        title: 'ml-3',
                        icon: 'left-1',
                    },
                }}
            />
        </BackgroundAnimationContext.Provider>
    );
}
