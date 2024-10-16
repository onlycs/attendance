import { ThemeProvider } from 'next-themes';
import { CookiesProvider } from 'next-client-cookies/server';

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
			</body>
		</html>
	);
}
