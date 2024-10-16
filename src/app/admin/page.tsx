'use client';

import { useTransitionOut } from '@lib/transitions';
import { Button } from '@ui/button';

import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Admin() {
	const router = useRouter();
	const cookies = useCookies();
	const { push } = useTransitionOut(router);

	useEffect(() => {
		router.prefetch('/attendance');
		router.prefetch('/csv');
	}, [router]);

	useEffect(() => {
		if (!cookies.get('token')) router.push('/login');
	}, [router, cookies]);

	return (
		<div className='flex flex-col gap-4'>
			<Button className="w-72" onClick={() => push('/attendance')}>
				Start Attendance&emsp;&rarr;
			</Button>
			<Button className="w-72" onClick={() => push('/csv')}>
				Download Student Hours&emsp;&rarr;
			</Button>
		</div>
	);
}