import React from 'react';
import { Toaster } from '@ui/sonner';
import { RecolorProvider } from '@components/util/recolor';

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <>
            <RecolorProvider>
                {children}
            </RecolorProvider>
            <Toaster
                toastOptions={{
                    classNames: {
                        title: 'ml-3',
                        icon: 'left-1',
                    },
                }}
            />
        </>
    );
}
