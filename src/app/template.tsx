import { RecolorProvider } from "@components/util/recolor";
import { Toaster } from "@ui/sonner";
import type React from "react";

export default function Template({ children }: { children: React.ReactNode }) {
	return (
		<>
			<RecolorProvider>{children}</RecolorProvider>
			<Toaster
				toastOptions={{
					classNames: {
						title: "ml-3",
						icon: "left-1",
					},
				}}
			/>
		</>
	);
}
