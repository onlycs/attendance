import { ThemeProvider } from 'next-themes';
import { CookiesProvider } from 'next-client-cookies/server';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import '@styles/globals.scss';
import type { ReactNode } from 'react';

export const metadata = {
    title: 'Attendance',
    description: 'Attendance tracking system',
};

export default function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <html lang='en' suppressHydrationWarning>
            <body className='bg-background'>
                <CookiesProvider>
                    <ThemeProvider attribute='class' defaultTheme='dark' enableSystem={false} themes={['dark', 'success', 'error']}>
                        {children}
                    </ThemeProvider>
                </CookiesProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
