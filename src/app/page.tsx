'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTransitionOut } from '@lib/transitions';

import React, { useEffect } from 'react';

export default function Home() {
	const router = useRouter();
	const { push } = useTransitionOut(router);

	useEffect(() => {
		router.prefetch('/login');
		router.prefetch('/student');
	}, [router]);

	return (
		<div className='flex flex-col gap-4'>
			<Button className="w-64" onClick={() => push('/login')}>
				Admin &rarr;
			</Button>
			<Button className="w-64" onClick={() => push('/student')}>
				Student &rarr;
			</Button>
		</div>
	);
}
