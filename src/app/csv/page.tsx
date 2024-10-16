'use client';

import { FetchError, InternalServerError, tfetch } from '@lib/api';
import { API_URL, cn } from '@lib/utils';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { Button } from '@ui/button';
import { Label } from '@ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@ui/pagination';
import { Spinner } from '@ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider } from '@ui/tooltip';
import { Download, File, HelpCircle } from 'lucide-react';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AuthProp {
	token: string;
}

function IdOnly({ token }: AuthProp) {
	return (
		<Button className="w-48" asChild>
			<a href={`${API_URL}/hours.csv?json=false&token=${token}`} download="hours.csv">
				Download
				<Download className="ml-4" size="16" />
			</a>
		</Button>
	);
}

function mapize(idhours: string[]): Record<string, number> {
	const map: Record<string, number> = {};

	for (const line of idhours) {
		if (!line) continue;
		const [id, hours] = line.split(',');
		map[id.trim()] = parseInt(hours.trim());
	}

	return map;
}

function merge(idname: string[], hrs: Record<string, number>, idcol: number, namecol: number): string {
	const map: Record<string, { name: string, hours: number }> = {};

	for (const line of idname) {
		if (!line) continue;
		const vals = line.split(',');
		const id = vals[idcol].trim();
		const name = vals[namecol].trim();
		const hours = hrs[id];
		map[id] = { name, hours };
	}

	let csv = 'id,name,hours\n';
	for (const entry of Object.keys(map)) {
		console.log(entry);

		csv += `${entry},${map[entry].name},${map[entry].hours}`;
	}

	return csv;
}

function Both({ token }: AuthProp) {
	const router = useRouter();

	const [error, setError] = useState<string | undefined>();
	const [status, setStatus] = useState<'upload' | 'loading' | 'download'>('upload');
	const [csv, setCsv] = useState('');

	const resetError = (error: string) => {
		setStatus('upload');
		setError(error);
	};

	const drop = (ev: React.DragEvent<HTMLDivElement>) => {
		setStatus('loading');
		ev.preventDefault();

		const file = ev.dataTransfer.files[0];

		if (!file) {
			resetError('No file uploaded.');
			return;
		}

		if (file.type !== 'text/csv') {
			resetError('Invalid file type. Please upload a CSV file.');
			return;
		}

		file.text().then(process);
	};

	const upload = (ev: React.ChangeEvent<HTMLInputElement>) => {
		setStatus('loading');
		ev.preventDefault();
		const file = ev.target.files?.[0];

		if (!file) {
			resetError('No file uploaded.');
			return;
		}

		if (file.type !== 'text/csv') {
			resetError('Invalid file type. Please upload a CSV file.');
			return;
		}

		file.text()
			.then(process);
	};

	const process = (file: string) => {
		const lines = file.split('\n');
		const header = lines[0].split(',');
		const body = lines.splice(1);

		const idcol = header.indexOf('id');
		const namecol = header.indexOf('name');

		console.log(idcol, namecol);

		if (idcol == undefined) {
			resetError('No ID header detected. Make sure the first line contains the correct header');
			return;
		}

		if (namecol == undefined) {
			resetError('No name header detected. Make sure the first line contains the correct header');
			return;
		}

		tfetch('/hours.csv', { token })
			.then(res => {
				if (!res.ok) {
					if (res.error!.ecode == 500) {
						resetError(InternalServerError);
					} else if (res.error!.ecode == 401) {
						router.push('/');
					} else {
						resetError('Failed to get csv');
					}
				}

				try {
					const csv = res.result!.csv;
					const hours = mapize(csv.split('\n').slice(1));
					const merged = merge(body, hours, idcol, namecol);

					setCsv(merged);
					setStatus('download');
				} catch (err) {
					console.log(err);
					resetError('Failed to parse CSV');
				}
			})
			.catch((err) => {
				console.log(err);
				resetError(FetchError);
			});
	};

	const UploadInner = () => {
		return (
			<>
				<TooltipProvider>
					<Tooltip delayDuration={0}>
						<TooltipTrigger className="relative ml-auto mb-auto mt-2 mr-2">
							<HelpCircle />
						</TooltipTrigger>
						<TooltipContent>
							<Label className="text-center text-md leading-5">
								Upload a CSV that contains every student&apos;s name and id, with the field titles &quot;name&quot; and &quot;id.&quot; <br />
								You will download a file that contains the student&apos;s name, id, and hours. <br />
								No student data ever leaves your computer.
							</Label>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<form className="-mt-4 w-full h-full flex items-center justify-center">
					<input type="file" accept=".csv" id="file-input" hidden onChange={upload} />
					<div className="flex flex-col items-center justify-center">
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
	};

	const DownloadInner = () => {
		return (
			<>
				<Button className="w-48" asChild>
					<a href={`data:text/csv;charset=utf8,${encodeURIComponent(csv)}`} download="hours.csv">
						Download
						<Download className="ml-4" size="16" />
					</a>
				</Button>
			</>
		);
	};

	const inner = {
		['upload']: <UploadInner />,
		['loading']: <Spinner />,
		['download']: <DownloadInner />,
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

export default function Csv() {
	const router = useRouter();
	const cookies = useCookies();
	const [selected, setSelected] = useState<0 | 1>(0);

	useEffect(() => {
		if (!cookies.get('token')) router.push('/login');
	});

	const element = {
		[0]: <IdOnly token={cookies.get('token')!} />,
		[1]: <Both token={cookies.get('token')!} />
	}[selected];

	return (
		<div className="flex flex-col">
			<div
				className="w-128 flex flex-col gap-8 mb-10 absolute"
				style={{
					left: '50%',
					top: '15%',
					transform: 'translateX(-50%)'
				}}
			>
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationLink onClick={() => setSelected(0)} isActive={!selected} className="w-60 select-none">
								Without Names
							</PaginationLink>
						</PaginationItem>
						<PaginationItem>
							<PaginationLink onClick={() => setSelected(1)} isActive={!!selected} className="w-60 select-none">
								With Names
							</PaginationLink>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</div>
			{element}
		</div>
	);
}