import React from 'react';

export const BackgroundAnimationContext = React.createContext<(color: string) => void>((_) => { });

export function useBackground() {
	return React.useContext(BackgroundAnimationContext);
}