'use client';

import { Input } from '@/components/ui/input';
import './globals.css';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:8080';

function InputId({ submit }: { submit: (_: number) => void }) {
	const [id, setId] = useState('');

	if (typeof window !== 'undefined') {
		document.querySelector('input')?.focus();
	}

	if (id.length === 5) {
		submit(parseInt(id));
		setId('');
	}

	return (
		<InputOTP className="border-gray-300" maxLength={5} pattern={REGEXP_ONLY_DIGITS} value={id} onChange={setId}>
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

function InputPassword({ submit, ...props }: { submit: (_: string) => void }) {
	const [password, setPassword] = useState('');

	const onSubmit = (ev: React.FormEvent) => {
		ev.preventDefault();
		submit(password);
		setPassword('');
	}

	return (
		<form onSubmit={onSubmit}>
			<Input className="border-gray-300" type="password" value={password} onChange={(ev) => setPassword(ev.target.value)} />
		</form>
	)
}

export default function Home() {
	// Data
	const [id, setId] = useState(undefined as number | undefined);
	const [token, setToken] = useState('');

	// Page State
	const [form, setForm] = useState<'password' | 'id' | 'name'>('password');
	const [message, setMessage] = useState('');

	// Update
	const onId = (id: number) => {
		alert(id);
		setId(id);
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
				if (response.ok) {
					setToken(response.token);
					setForm('id');
				} else setMessage('Invalid password');
			})
			.catch(() => setMessage('Invalid password'));
	};

	const formComponent = {
		['id']: <InputId submit={setId} />,
		['password']: <InputPassword submit={onPassword} />,
		['name']: <></>
	}[form];

	const aboveMessage = {
		['id']: 'Enter your student ID, or scan your barcode',
		['password']: 'Enter admin password to start attendance',
		['name']: 'Unrecognized student ID. Enter your name'
	}[form];

	const background = {
		['id']: 'bg-background',
		['password']: 'bg-background',
		['name']: 'bg-red-500'
	}[form];

	return (
		<div className={`flex flex-col items-center justify-center w-full h-full ${background}`}>
			<div className='text-center text-md font-medium mb-4'>
				{aboveMessage}
			</div>
			{formComponent}
			<div className='text-center text-md font-medium mt-4 text-red-400'>
				{message}
			</div>
		</div>
	);
}
