'use client';

import { InputId } from '@components/forms';
import { Button } from '@ui/button';
import { useTransitionOut } from '@lib/transitions';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@lib/utils';
import { FetchError, InternalServerError, tfetch } from '@lib/api';
import { Label } from '@ui/label';

interface IdInputProps {
	error: string,
	setError: (_: string) => void,
}

function IdInput({ error, setError }: IdInputProps) {
	const router = useRouter();

	const { push } = useTransitionOut(router);
	const [id, setId] = useState<string>('');

	return (
		<div className='flex flex-col items-center justify-center'>
			<div className="text-center text-md font-medium mb-4">
				Please enter your ID
			</div>
			<form className="flex flex-col items-center justify-center" onSubmit={(ev) => {
				ev.preventDefault();
				if (id.length == 5) push(`/student?id=${id}`);
				else setError('Please enter a full student ID');
			}}>
				<InputId value={id} onChange={setId} />
				<Button className='mt-4 w-52' type='submit'>Go &rarr;</Button>
			</form>
			<div className="text-center text-md font-medium mt-4 text-red-400">
				{error}
			</div>
		</div>
	);
}

function Loading() {
	return (
		<div>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn('animate-spin')}
			>
				<path d="M21 12a9 9 0 1 1-6.219-8.56" />
			</svg>
		</div>
	);
}

export default function Student() {
	const params = useSearchParams();

	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const [hours, setHours] = useState<number | undefined>();

	useEffect(() => {
		const id = params.get('id');
		if (!id) return;

		setLoading(true);
		tfetch('/hours', { id })
			.then(res => {
				if (res.ok) setHours(res.result!.hours);
				else setError(res.error!.ecode == 500 ? InternalServerError : 'Invalid student ID');
			})
			.catch(() => setError(FetchError))
			.finally(() => setLoading(false));
	}, [params]);

	if (!params.get('id') || error) return <IdInput error={error} setError={setError} />;

	return (
		<>
			<div style={{
				position: 'absolute',
				opacity: +loading,
				transition: 'all 0.2s ease'
			}}>
				<Loading />
			</div>
			<div style={{
				opacity: +!loading,
				transition: 'all 0.5s ease'
			}}>
				<Label className='text-2xl'>Hours: {hours}</Label>
			</div>
		</>
	);
}