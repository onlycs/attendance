import { ThemeProvider } from 'next-themes';
import { CookiesProvider } from 'next-client-cookies/server';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import '@styles/globals.scss';

export const metadata = {
	title: 'Attendance',
	description: 'Attendance tracking system',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode,
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className='bg-background'>
				<CookiesProvider>
					<ThemeProvider attribute="class" defaultTheme="dark">
						{children}
					</ThemeProvider>
				</CookiesProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
