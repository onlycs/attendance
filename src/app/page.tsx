'use client';

import './globals.css';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useEffect, useState } from 'react';

export default function Home() {
	if (typeof window !== 'undefined') {
		document.querySelector('input')?.focus();
	}

	const [value, setValue] = useState('');

	if (value.length === 5) {
		alert('OTP: ' + value);
		setValue('');
	}

	return (
		<div className="flex flex-column justify-center items-center w-full h-full">
			<InputOTP maxLength={5} pattern={REGEXP_ONLY_DIGITS} value={value} onChange={setValue}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
				</InputOTPGroup>
			</InputOTP>
		</div>
	);
}
