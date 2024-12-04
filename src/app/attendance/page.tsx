'use client';

import { InputId } from '@components/forms';
import { FetchError, GetError, tfetch } from '@lib/api';
import { Button } from '@ui/button';
import { useCookies } from 'next-client-cookies';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { JSX, useEffect, useState } from 'react';
import sha256 from 'sha256';

export default function Attendance() {
	const cookies = useCookies();
	const router = useRouter();

	const [error, setError] = useState<string | JSX.Element>('');
	const [success, setSuccess] = useState('');
	const [id, setId] = useState<string>('');

	useEffect(() => {
		if (!cookies.get('token')) router.push('/login');
	});

	const setTheme = (set: 'success' | 'dark' | 'error') => {
		['dark', 'success', 'error'].filter(t => t != set).forEach(t => {
			// hax
			if (document) {
				const html = document.querySelector('html')!;
				html.classList.remove(t);
			}
		});

		// hax
		if (document) {
			const html = document.querySelector('html')!;
			html.classList.add(set);
		}
	};

	const resetAll = () => {
		setError('');
		setSuccess('');
		setTheme('dark');
	};

	const resetSuccess = (msg: string) => {
		setError('');
		setSuccess(msg);
		setTheme('success');
		setTimeout(() => resetAll(), 5000);
	};

	const resetError = (msg: string | JSX.Element) => {
		setError(msg);
		setSuccess('');
		setTheme('error');
		setTimeout(() => resetAll(), 5000);
	};

	const submit = () => {
		tfetch('/roster', {
			token: cookies.get('token')!,
			id: sha256(id),
		})
			.then(res => {
				if (!res.ok) {
					resetError(GetError(res.error!.ecode, res.error!.message));
					return;
				}

				if (res.result!.login) resetSuccess('Logged in');
				else resetError('Logged out');
			})
			.then(() => setTimeout(() => resetSuccess(''), 5000))
			.catch(FetchError(resetError));

		setId('');
	};

	return (
		<div className='flex flex-col items-center justify-center h-full'>
			<div className="text-center text-md font-medium mb-4">
				Please enter or scan your ID
			</div>
			<form className="flex flex-col items-center justify-center" onSubmit={(ev) => {
				ev.preventDefault();
				if (id.length == 5) submit();
				else resetError('Please enter a full student ID');
			}}>
				<InputId value={id} onChange={setId} />
				<Button className='mt-4' style={{ width: '12.5rem' }} type='submit' variant='filled'>Go&nbsp;&nbsp;&rarr;</Button>
			</form>

			<div className="text-center text-2xl mt-4 relative">
				&#8203;{error}
			</div>
			<div className="text-center text-2xl relative bottom-8">
				&#8203;{success}
			</div>
		</div>
	);
}