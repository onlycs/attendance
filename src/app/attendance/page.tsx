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
	const theme = useTheme();

	const [error, setError] = useState<string | JSX.Element>('');
	const [success, setSuccess] = useState('');
	const [id, setId] = useState<string>('');
	const [force, setForce] = useState(undefined as string | undefined);
	const [timeout, setResetTimeout] = useState(undefined as any);

	const tokencheck = () => {
		if (!cookies.get('token')) router.push('/login');

		tfetch('/auth_check', { token: cookies.get('token')! })
			.then(res => {
				if (!res.ok && res.error!.code == 401) {
					cookies.remove('token');
					router.push('/login');

					return;
				}
			});
	};

	useEffect(tokencheck);

	// no but actually
	const flashbang = (set: 'success' | 'error') => {
		theme.setTheme(set);
	};

	const resetAll = () => {
		setError('');
		setSuccess('');
		theme.setTheme('dark');

		tokencheck();
	};

	const resetSuccess = (msg: string) => {
		setError('');
		setSuccess(msg);
		flashbang('success');
	};

	const resetError = (msg: string | JSX.Element) => {
		setError(msg);
		setSuccess('');
		flashbang('error');
	};

	const submit = () => {
		tfetch('/roster', {
			token: cookies.get('token')!,
			id: sha256(id),
			force: force === id,
		})
			.then(res => {
				if (!res.ok) {
					resetError(GetError(res.error!.code, res.error!.message));

					if (res.error!.code == 401) {
						cookies.remove('token');
					}

					return;
				}

				if (res.result!.needs_force) {
					resetError('Logged out too quickly. Try again to confirm.');
					setForce(id);
					return;
				}

				if (res.result!.is_login) resetSuccess('Logged in');
				else resetError(`Logged out${force === id ? ' forcefully' : ''}`);

				if (force) {
					setForce(undefined);
				}
			})
			.then(() => {
				if (timeout) clearTimeout(timeout);
				setResetTimeout(setTimeout(() => { resetAll(); }, 1500));
			})
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