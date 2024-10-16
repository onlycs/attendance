'use client';

import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { API_URL } from "@lib/utils";
import { useTransitionOut } from "@lib/transitions";

import { useEffect, useState } from "react";
import { useCookies } from "next-client-cookies";
import { useRouter } from "next/navigation";
import { FetchError, tfetch } from "@lib/api";

export default function Teacher() {
	const cookies = useCookies();
	const router = useRouter();
	const { push } = useTransitionOut(router);
	const [error, setError] = useState('');

	useEffect(() => {
		if (cookies.get('token')) router.push('/admin');
	}, []);

	const onSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
		ev.preventDefault();
		const password = ev.currentTarget.password.value;

		tfetch('/login', { password })
			.then(res => {
				if (res.ok) {
					cookies.set('token', res.result!.token);
					push('/admin');
				} else {
					setError(
						{
							[500]: 'Problem with the server. Get Angad to fix this',
							[401]: 'Incorrect Password',
						}[res.error!.ecode] || 'Invalid input'
					);
				}
			})
			.catch(() => setError(FetchError));
	};

	return (
		<div className='flex flex-col items-center justify-center'>
			<div className="text-center text-md font-medium mb-2">
				Please enter the admin password
			</div>
			<form className="flex flex-col items-center justify-center" onSubmit={onSubmit}>
				<Input id="password" className='text-center mt-4' type='password' />
				<Button className='mt-4 w-64'>Login &rarr;</Button>
			</form>
			<div className="text-center text-md font-medium mt-4 text-red-400">
				{error}
			</div>
		</div>
	);
}