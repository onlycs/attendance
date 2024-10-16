'use client';

import { useRouter } from 'next/navigation';
import { Button } from './button';
import { useTransitionOut } from '@lib/transitions';

export function BackButton() {
	const router = useRouter();
	const { push } = useTransitionOut(router);

	return (
		<Button
			className='absolute top-4 left-4 z-50'
			onClick={() => push('/')}
			variant='outline'
		>
			Home
		</Button>
	);
}