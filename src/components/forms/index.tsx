import { InputOTPSlot, InputOTP, InputOTPGroup } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import React, { useEffect, useState } from "react";

export function InputId({ complete, noClear }: { complete: (_: number) => void, noClear?: boolean }) {
	const [id, setId] = useState('');

	useEffect(() => {
		if (id.length == 0) (document.querySelector('input[autocomplete="one-time-code"]') as (HTMLElement)).focus();
	});

	if (id.length === 5) {
		complete(parseInt(id));

		if (!noClear) {
			setId('');
		}
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

export function InputPassword({ submit }: { submit: (_: string) => void }) {
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

export function InputName({ submit, setError }: { submit: (_: string) => void, setError: (_: string) => void }) {
	const [name, setName] = useState('');

	const onSubmit = (ev: React.FormEvent) => {
		ev.preventDefault();

		const subnames = name.split(' ').map((subname) => subname.trim()).filter((subname) => subname.length > 0);

		if (subnames.length != 2) {
			setError('Please enter your first and last name, only');
			return;
		}

		const fixedname = subnames.map((subname) => subname[0].toUpperCase() + subname.slice(1)).join(' ');

		submit(fixedname);
		setName('');
	}

	return (
		<form onSubmit={onSubmit}>
			<Input className="bg-red-500 border-red-400 focus-visible:ring-red-300 focus-visible:ring-0 text-center" placeholder='e.x. John Doe' value={name} onChange={(ev) => setName(ev.target.value)} />
		</form>
	)
}