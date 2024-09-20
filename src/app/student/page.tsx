'use client';

import { InputId } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_URL } from '@/lib/utils';
import { useState } from 'react';

function Form({ submit, setError }: { submit: (name: string, id: number) => void, setError: (_: string) => void }) {
	const [name, setName] = useState('');
	const [id, setId] = useState(undefined as number | undefined);

	const onSubmit = (ev: React.FormEvent) => {
		ev.preventDefault();

		if (id === undefined) {
			setError('Please enter your ID');
			return;
		}

		if (name.length === 0) {
			setError('Please enter your name');
			return;
		}

		submit(name, id);
	};

	return (
		<form className="flex flex-col items-center justify-center" onSubmit={onSubmit}>
			<InputId complete={setId} noClear />
			<Input className='text-center mt-4' placeholder='e.x. John Doe' value={name} onChange={(ev) => setName(ev.target.value)} />
			<Button className='mt-4 w-64' type='submit'>Go!</Button>
		</form>
	);
}

function Success({ name, uid, hours }: { name: string, uid: number, hours: number }) {
	return (
		<>
			<Label className="text-lg">{name}</Label>
			<Label className="text-sm text-gray-300 mb-16">{uid}</Label>
			<Label className="text-xl">Hours: {hours}</Label>
		</>
	);
}

export default function Student() {
	// Data
	const [id, setId] = useState(undefined as number | undefined);
	const [name, setName] = useState('');
	const [hours, setHours] = useState(0);

	// Page State
	const [page, setPage] = useState<'form' | 'success'>('form');
	const [error, setError] = useState('');

	// Updates
	const resetPage = (page: 'form' | 'success') => {
		setError('');
		setPage(page);
	};

	const onForm = (name: string, id: number) => {
		setId(id);
		setName(name);

		fetch(`${API_URL}/hours?id=${id}&name=${name}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
			.then((res) => res.json())
			.then((res) => {
				setHours(res.hours);
				resetPage('success');
			})
			.catch(() => {
				setError('Invalid name, ID, or user not found');
			});
	};

	const pageComponent = {
		['form']: <Form submit={onForm} setError={setError} />,
		['success']: <Success name={name} uid={id!} hours={hours} />
	}[page];

	const aboveMessage = {
		['form']: 'Please enter your ID and name',
		['success']: ''
	}[page];

	return (
		<div className="flex flex-col items-center justify-center w-full h-full bg-background">
			<div className="text-center text-md font-medium mb-4">
				{aboveMessage}
			</div>
			{pageComponent}
			<div className="text-center text-md font-medium mt-4 text-red-400">
				{error}
			</div>
		</div>
	);
}