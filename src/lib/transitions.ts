import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import React from 'react';

export const TransitionOutContext = React.createContext<(callback: () => void) => void>((_) => { });

export function useTransitionOut(router: AppRouterInstance) {
	const transition = React.useContext(TransitionOutContext);

	return {
		push: (path: string) => transition(() => router.push(path)),
		replace: (path: string) => transition(() => router.replace(path)),
	};
}