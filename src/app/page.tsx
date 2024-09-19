'use client';

import './globals.css';
import React, { useState } from 'react';
import Link from 'next/link';
import { InputId, InputName, InputPassword } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { API_URL } from '@/lib/utils';

export default function Home() {
	// Data
	const [id, setId] = useState(undefined as number | undefined);
	const [token, setToken] = useState('');

	// Page State
	const [form, setForm] = useState<'password' | 'id' | 'name'>('password');
	const [error, setError] = useState('');

	// Updates
	const resetForm = (form: 'password' | 'id' | 'name') => {
		setError('');
		setForm(form);
	};

	const parseFetch = async (f: void | Response): Promise<any | void> => {
		if (!f) return;

		const text = await f.text();

		if (!f.ok) {
			setError(text);
			return;
		}

		return JSON.parse(text || '{}');
	};

	const onPassword = async (password: string) => {
		const res = await fetch(`${API_URL}/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ password })
		}).catch(() => setError('Failed to connect to server'));

		const data = await parseFetch(res);
		if (!data) return;

		setToken(data.token);
		resetForm('id');
	};

	const onId = async (id: number) => {
		setId(id);

		const exists_res = await fetch(`${API_URL}/exists`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ id }),
		}).catch(() => setError('Failed to connect to server'));

		const exists_data = await parseFetch(exists_res);

		if (!exists_data) return;
		if (!exists_data.exists) {
			resetForm('name');
			return;
		}

		const res = await fetch(`${API_URL}/log`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ id })
		}).catch(() => setError('Failed to connect to server'));

		await parseFetch(res);
	};

	const onName = async (name: string) => {
		const res = await fetch(`${API_URL}/register`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ id, name })
		}).catch(() => setError('Failed to connect to server'));

		const data = await parseFetch(res);
		if (!data) return;

		resetForm('id');
	};

	const formComponent = {
		['id']: <InputId complete={onId} />,
		['password']: <InputPassword submit={onPassword} />,
		['name']: <InputName submit={onName} setError={setError}></InputName>
	}[form];

	const aboveMessage = {
		['id']: 'Enter your student ID, or scan your barcode',
		['password']: 'Enter admin password to start attendance',
		['name']: 'Unrecognized student ID. Enter your name'
	}[form];

	const background = {
		['id']: 'bg-background',
		['password']: 'bg-background',
		['name']: 'bg-red-700'
	}[form];

	const errorcol = {
		['id']: 'text-red-400',
		['password']: 'text-red-400',
		['name']: 'text-white'
	}[form];

	return (
		<div className={`flex flex-col items-center justify-center w-full h-full ${background}`}>
			<div className='text-center text-md font-medium mb-4'>
				{aboveMessage}
			</div>
			{formComponent}
			<div className={`text-center text-md font-medium mt-4 ${errorcol}`}>
				{error}
			</div>
			{form === 'password' && (
				<>
					<div className='flex flex-row justify-center items-center gap-4 mt-8 mb-4 w-96'>
						<div className='w-full h-0.5 bg-slate-300' />
						<p>or</p>
						<div className='w-full h-0.5 bg-slate-300' />
					</div>
					<div className='flex flex-row justify-center items-center gap-4'>
						<TooltipProvider>
							<Tooltip delayDuration={0}>
								<TooltipTrigger asChild>
									{/* magic to extend the hover hitbox */}
									<div className='pl-16 -ml-16 py-16 -my-16 z-10'>
										<Button className='w-48' asChild>
											<Link href={`${API_URL}/csv`}>Admin - Download CSV</Link>
										</Button>
									</div>
								</TooltipTrigger>
								{/* offset required due to magic used above */}
								<TooltipContent className='-mb-16 mt-8 -mr-16'>
									<p>The username is &quot;admin&quot;</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<Button className='w-48' asChild>
							<Link href='/student'>Student - View Hours</Link>
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
