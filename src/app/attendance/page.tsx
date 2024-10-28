'use client';

import { InputId } from '@components/forms';
import { FetchError, GetError, tfetch } from '@lib/api';
import { useTransitionOut } from '@lib/transitions';
import { Button } from '@ui/button';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import { JSX, useEffect, useState } from 'react';

export default function Attendance() {
	const cookies = useCookies();
	const router = useRouter();

	const [error, setError] = useState<string | JSX.Element>('');
	const [success, setSuccess] = useState('');
	const [id, setId] = useState<string>('');

	useEffect(() => {
		if (!cookies.get('token')) router.push('/login');
	});

	const resetSuccess = (msg: string) => {
		setError('');
		setSuccess(msg);
	};

	const resetError = (msg: string | JSX.Element) => {
		setError(msg);
		setSuccess('');
	};

	const submit = () => {
		tfetch('/roster', {
			token: cookies.get('token')!,
			id: id,
		})
			.then(res => {
				if (!res.ok) {
					resetError(GetError(res.error!.ecode, res.error!.message));
					return;
				}

				if (res.result!.login) resetSuccess('Logged in');
				else resetSuccess('Logged out');
			})
			.catch(FetchError(resetError));

		setId('');
	};

	return (
		<div className='flex flex-col items-center justify-center'>
			<div className="text-center text-md font-medium mb-4">
				Please enter or scan your ID
			</div>
			<form className="flex flex-col items-center justify-center" onSubmit={(ev) => {
				ev.preventDefault();
				if (id.length == 5) submit();
				else resetError('Please enter a full student ID');
			}}>
				<InputId value={id} onChange={setId} />
				<Button className='mt-4 w-52' type='submit'>Go&nbsp;&nbsp;&rarr;</Button>
			</form>
			<div className="text-center text-md font-medium mt-4 text-red-400">
				{error}
			</div>
			<div className="text-center text-md font-medium text-green-400">
				{success}
			</div>
		</div>
	);
}