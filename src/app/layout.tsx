import { ThemeProvider } from "next-themes"

export const metadata = {
	title: 'Attendance App',
	description: 'Team 2791\'s Attendance App',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<body>
				<ThemeProvider attribute="class" defaultTheme="dark">
					{children}
				</ThemeProvider>
			</body>
		</html>
	)
}
