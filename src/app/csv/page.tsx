'use client';

import { FetchError, GetError, tfetch } from '@lib/api';
import { processCsv } from '@lib/csv';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { Button } from '@ui/button';
import { Label } from '@ui/label';
import { Spinner } from '@ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider } from '@ui/tooltip';
import { DownloadIcon, File, HelpCircle } from 'lucide-react';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { cn } from '@lib/utils';

type Status = 'upload' | 'loading' | 'download';
type Error = React.JSX.Element | string | undefined;

interface SubpageProps {
	upload: (ev: React.ChangeEvent<HTMLInputElement>) => void;
	error: Error;
	csv: string;
}

function Upload({ upload, error }: SubpageProps) {
	return (
		<>
			<TooltipProvider>
				<Tooltip delayDuration={0}>
					<TooltipTrigger className="relative ml-auto mb-auto mt-2 mr-2">
						<HelpCircle />
					</TooltipTrigger>
					<TooltipContent>
						<Label className="text-center text-md leading-5">
							Upload a CSV that contains every student&apos;s ids, <br />
							and all other data other than hours (e.g. name, etc.) <br />
							The CSV should have a header row. The leftmost column <br />
							should be the student id. <br /><br />

							Example input
							<p className='font-mono'>
								id, name, ... <br />
								123456, John Doe, ... <br />
							</p>

							Example output
							<p className='font-mono'>
								id, name, ..., total, learning, build, ... (daily data) <br />
								123456, John Doe, ..., 10, 5, 5, ... <br />
							</p>
						</Label>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<form className="-mt-4 w-full h-full flex flex-col items-center justify-center">
				<input type="file" accept=".csv" id="file-input" hidden onChange={upload} />
				<div className="flex flex-col items-center mt-auto justify-center">
					<File />
					<Label className="mt-2 cursor-pointer text-center leading-5" htmlFor="file-input">
						Drag or Click <br />
						to Upload CSV
					</Label>
				</div>
				<Label className="text-center text-md font-medium text-red-400 mt-auto mb-2">
					{error || ' '}
				</Label>
			</form>
		</>
	);
}

function Download({ csv }: SubpageProps) {
	return (
		<Button className="w-48" asChild>
			<a href={`data:text/csv;charset=utf8,${encodeURIComponent(csv)}`} download="hours.csv">
				Download
				<DownloadIcon className="ml-4" size="16" />
			</a>
		</Button>
	);
}

export default function Csv() {
	const router = useRouter();
	const cookies = useCookies();

	const [error, setError] = useState<React.JSX.Element | string | undefined>();
	const [status, setStatus] = useState<Status>('upload');
	const [csv, setCsv] = useState('');

	const resetError = (error: React.JSX.Element | string) => {
		setStatus('upload');
		setError(error);
	};

	useEffect(() => {
		if (!cookies.get('token')) router.push('/login');
	});

	const drop = (ev: React.DragEvent<HTMLDivElement>) => {
		ev.preventDefault();
		process(ev.dataTransfer.files[0]);
	};

	const upload = (ev: React.ChangeEvent<HTMLInputElement>) => {
		ev.preventDefault();
		process(ev.target.files?.[0]);
	};

	const process = async (file: File | undefined) => {
		setStatus('loading');

		if (!file) {
			resetError('No file uploaded.');
			return;
		}

		if (file.type !== 'text/csv') {
			resetError('Invalid file type. Please upload a CSV file.');
			return;
		}

		const text = await file.text().catch(() => {
			resetError('Failed to read file');
		});

		if (!text) return;

		tfetch('/hours.csv', { token: cookies.get('token')! })
			.then(res => {
				if (!res.ok) {
					resetError(GetError(res.error!.ecode, res.error!.message));
					return;
				}

				try {
					const csv = res.result!.csv;
					const out = processCsv(text, csv);

					setCsv(out);
					setStatus('download');
				} catch (err) {
					resetError('Failed to parse CSV');
				}
			})
			.catch(FetchError(resetError));
	};

	const inner = {
		['upload']: <Upload upload={upload} error={error} csv={csv} />,
		['loading']: <Spinner />,
		['download']: <Download upload={upload} error={error} csv={csv} />,
	}[status];

	return (
		<div className="flex flex-col items-center justify-center">
			<div
				className={cn(
					'w-96 h-48 mt-10',
					'flex flex-col items-center justify-center',
					'border border-white rounded-xl',
					'cursor-pointer',
					'z-10',
				)}
				onDrop={drop}
				onClick={() => document.getElementById('file-input')?.click()}
			>
				{inner}
			</div>
		</div>
	);
}