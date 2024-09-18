'use client';

import { Input } from '@/components/ui/input';
import './globals.css';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:8080';

function InputId({ submit }: { submit: (_: number) => void }) {
	const [id, setId] = useState('');

	useEffect(() => {
		document.querySelector('input')?.focus();
	});

	if (id.length === 5) {
		submit(parseInt(id));
		setId('');
	}

	return (
		<InputOTP maxLength={5} pattern={REGEXP_ONLY_DIGITS} value={id} onChange={setId}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
			</InputOTPGroup>
		</InputOTP>
	)
}

function InputPassword({ submit }: { submit: (_: string) => void }) {
	const [password, setPassword] = useState('');

	const onSubmit = (ev: React.FormEvent) => {
		ev.preventDefault();
		submit(password);
		setPassword('');
	}

	return (
		<form onSubmit={onSubmit}>
			<Input type="password" value={password} onChange={(ev) => setPassword(ev.target.value)} />
		</form>
	)
}

function InputName({ submit }: { submit: (_: string) => void }) {
	const [name, setName] = useState('');

	const onSubmit = (ev: React.FormEvent) => {
		ev.preventDefault();
		submit(name);
		setName('');
	}

	return (
		<form onSubmit={onSubmit}>
			<Input className="bg-red-500 border-red-400 focus-visible:ring-red-300 focus-visible:ring-0 text-center" placeholder='e.x. John Doe' value={name} onChange={(ev) => setName(ev.target.value)} />
		</form>
	)
}

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

	const onPassword = (password: string) => {
		fetch(`${API_URL}/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ password })
		})
			.then((response) => response.json())
			.then((response) => {
				setToken(response.token);
				resetForm('id');
			})
			.catch(() => setError('Invalid password'));
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
		}).catch(() => setError('Invalid ID'));

		if (!exists_res) return;

		const exists_data = await exists_res.json();
		if (!exists_data.exists) {
			resetForm('name');
			return;
		}

		await fetch(`${API_URL}/log`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ id })
		}).catch(() => setError('Invalid ID'));
	};

	const onName = (name: string) => {
		fetch(`${API_URL}/register`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ id, name })
		})
			.then(() => resetForm('id'))
			.catch(() => setError('Invalid name or ID'));
	};

	const formComponent = {
		['id']: <InputId submit={onId} />,
		['password']: <InputPassword submit={onPassword} />,
		['name']: <InputName submit={onName}></InputName>
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

	return (
		<div className={`flex flex-col items-center justify-center w-full h-full ${background}`}>
			<div className='text-center text-md font-medium mb-4'>
				{aboveMessage}
			</div>
			{formComponent}
			<div className='text-center text-md font-medium mt-4 text-red-400'>
				{error}
			</div>
		</div>
	);
}
