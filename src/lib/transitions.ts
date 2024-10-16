import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname } from "next/navigation";
import React from "react";

export const TransitionOutContext = React.createContext<(callback: () => void) => void>((_) => { });

export function useTransitionOut(router: AppRouterInstance) {
	const transition = React.useContext(TransitionOutContext);
	const path = usePathname();

	return {
		push: (path: string) => transition(() => router.push(path)),
		replace: (path: string) => transition(() => router.replace(path)),
	};
}