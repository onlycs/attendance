'use client';

import { cn } from '@lib/utils';
import React, { ReactNode } from 'react';

export const RecolorContext = React.createContext<(bg: 'error' | 'success' | 'normal') => void>((_) => {});

export function useRecolor() {
    return React.useContext(RecolorContext);
}

export function RecolorProvider({ children }: { children: ReactNode }) {
    const [recolor, setRecolorPrim] = React.useState<'error' | 'success' | 'normal'>('normal');
    const [activeId, setActiveId] = React.useState<number | null>(null);

    const setRecolor = (bg: 'error' | 'success' | 'normal') => {
        setRecolorPrim(bg);
        if (bg === 'normal') return;

        const id = Math.random();
        setActiveId(id);
        setTimeout(() => {
            if (activeId !== id) return;
            setRecolorPrim('normal');
        }, 2000);
    };

    return (
        <RecolorContext.Provider value={setRecolor}>
            <div
                className={cn(
                    'flex flex-row w-full h-full items-center justify-center bg-background',
                    'transition duration-850 ease-in-out',
                    recolor,
                )}
            >
                {children}
            </div>
        </RecolorContext.Provider>
    );
}
