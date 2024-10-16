'use client';

import { useTransitionOut } from "@lib/transitions";
import { Button } from "@ui/button";

import { useCookies } from "next-client-cookies";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Admin() {
	const router = useRouter();
	const cookies = useCookies();
	const { push } = useTransitionOut(router);

	useEffect(() => {
		router.prefetch('/attendance');
		router.prefetch('/download');
	}, []);

	useEffect(() => {
		if (!cookies.get('token')) router.push('/login');
	});

	return (
		<div className='flex flex-col gap-4'>
			<Button className="w-72" onClick={() => push('/attendance')}>
				Start Attendance&emsp;&rarr;
			</Button>
			<Button className="w-72" onClick={() => push('/download')}>
				Download Student Hours&emsp;&rarr;
			</Button>
		</div>
	);
}