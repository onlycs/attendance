import { CookiesProvider } from "next-client-cookies/server";
import { ThemeProvider } from "next-themes";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "@styles/globals.scss";
import { Label } from "@ui/label";
import { HeartIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconBrandGithub } from "tabler-icons";

export const metadata = {
	title: "Attendance",
	description: "Attendance tracking system",
};

export default function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="bg-background">
				<CookiesProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem={false}
						themes={["dark", "success", "error"]}
					>
						{children}

						<div className="fixed bottom-0 right-0 z-50 bg-drop md:h-10 h-8 w-screen flex flex-row items-center px-4 justify-between">
							<div className="self-start flex flex-row items-center md:gap-3 gap-2 h-full">
								<Label className="text-sm md:text-md">Made with</Label>
								<HeartIcon className="inline-block text-red-500" size={16} />
								<Label className="text-sm md:text-md">by</Label>
								<Link
									href="https://github.com/onlycs"
									className="underline text-sm md:text-md"
									target="_blank"
								>
									Angad
								</Link>
								<Label className="text-sm md:text-md hidden md:flex">for</Label>
								<Link
									className="text-sm md:text-md underline hidden md:flex"
									href="https://www.thebluealliance.com/team/2791"
									target="_blank"
								>
									Team 2791
								</Link>
							</div>
							<div className="self-end flex flex-row items-center md:gap-3 gap-2 h-full">
								<Link
									href="https://github.com/onlycs/attendance"
									className="w-[20px] h-[20px]"
									target="_blank"
								>
									<IconBrandGithub
										className="inline-block -mt-[6px]"
										size={18}
									/>
								</Link>
								<Link
									href="https://www.thebluealliance.com/team/2791"
									target="_blank"
								>
									<Image
										src="/tba-white.svg"
										color="white"
										width={10}
										height={10}
										alt="The Blue Alliance Logo"
									/>
								</Link>
							</div>
						</div>
					</ThemeProvider>
				</CookiesProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
