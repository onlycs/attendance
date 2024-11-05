'use client';

import { InputId } from '@components/forms';
import { Button } from '@ui/button';
import { useTransitionOut } from '@lib/transitions';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FetchError, GetError, HoursResponse, tfetch } from '@lib/api';
import { Label } from '@ui/label';
import { Spinner } from '@ui/spinner';
import sha256 from 'sha256';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';

interface IdInputProps {
	error: string | React.JSX.Element,
	setError: (_: React.JSX.Element | string) => void,
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
				if (id.length == 5) push(`/student?id=${sha256(id)}`);
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

export default function Student() {
	const params = useSearchParams();

	const [error, setError] = useState<string | React.JSX.Element>('');
	const [loading, setLoading] = useState(true);
	const [hours, setHours] = useState<HoursResponse | undefined>();

	useEffect(() => {
		const id = params.get('id');
		if (!id) return;

		setLoading(true);
		tfetch('/hours', { id })
			.then(res => {
				if (!res.ok) {
					setError(GetError(res.error!.ecode, res.error!.message));
					return;
				}
				setHours(res.result!);
			})
			.catch(FetchError(setError))
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
				<Spinner />
			</div>
			<div style={{
				opacity: +!loading,
				transition: 'all 0.5s ease'
			}}>
				<Table className='text-lg rounded-md'>
					<TableCaption>Student Hours</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className='w-48'>Hours Type</TableHead>
							<TableHead className='w-44 text-center'>Hours Earned</TableHead>
							<TableHead className='w-44 text-center'>Hours Remaining</TableHead>
							<TableHead className='text-center'>Total Required</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell className='font-bold'>Learning Days</TableCell>
							<TableCell className='text-center'>{hours?.learning}</TableCell>
							<TableCell className='text-center'>{8 - (hours?.learning ?? 0)}</TableCell>
							<TableCell className='text-center'>8</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className='font-bold'>Build Season</TableCell>
							<TableCell className='text-center'>{hours?.build}</TableCell>
							<TableCell className='text-center'>{40 - (hours?.build ?? 0)}</TableCell>
							<TableCell className='text-center'>40</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
		</>
	);
}