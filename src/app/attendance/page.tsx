'use client';

import { InputId } from "@components/forms";
import { FetchError, InternalServerError, tfetch } from "@lib/api";
import { useTransitionOut } from "@lib/transitions";
import { Button } from "@ui/button";
import { useCookies } from "next-client-cookies";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Attendance() {
	const cookies = useCookies();
	const router = useRouter();

	const { push } = useTransitionOut(router);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [id, setId] = useState<string>('');

	useEffect(() => {
		if (!cookies.get('token')) router.push('/login');
	});

	const resetSuccess = (msg: string) => {
		setError('');
		setSuccess(msg);
	}

	const resetError = (msg: string) => {
		setError(msg);
		setSuccess('');
	}

	const submit = () => {
		tfetch(`/roster`, {
			token: cookies.get('token')!,
			id: id,
		})
			.then(res => {
				if (res.ok) {
					if (res.result!.login) resetSuccess('Logged in');
					else resetSuccess('Logged out');
				} else {
					if (res.error!.ecode == 401) {
						cookies.remove('token');
						push('/login');
					} else if (res.error!.ecode == 500) resetError(InternalServerError);
					else resetError('Failed to log user');
				}
			})
			.catch(() => resetError(FetchError));
	};

	return (
		<div className='flex flex-col items-center justify-center'>
			<div className="text-center text-md font-medium mb-4">
				Please enter your ID
			</div>
			<form className="flex flex-col items-center justify-center" onSubmit={(ev) => {
				ev.preventDefault();
				submit();
			}}>
				<InputId value={id} onChange={setId} />
				<Button className='mt-4 w-52' type='submit'>Go&nbsp;&nbsp;&rarr;</Button>
			</form>
			<div className="text-center text-md font-medium mt-4 text-red-400">
				{error}
			</div>
			<div className="text-center text-md font-medium text-green-400">
				{success}
			</div>
		</div>
	);
}