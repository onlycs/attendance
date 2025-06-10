"use client";

import type { InputOTPSlotRef } from "@ui/input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import React, { useImperativeHandle, useState } from "react";

export interface InputStudentIdRef {
	studentId: string;
	setStudentId: (value: string) => void;
}

export interface InputStudentIdProps {
	submit?: (id: string) => void;
	onFocus?: () => void;
	onBlur?: () => void;
	className?: string;
	autoFocus?: boolean;
}

export const InputStudentId = React.forwardRef<
	InputStudentIdRef,
	InputStudentIdProps
>((props, ref) => {
	const [value, setValue] = useState("");
	const lastOtp = React.useRef<InputOTPSlotRef>(null);

	const onChange = (newValue: string) => {
		setValue(newValue);

		if (newValue.length === 5) {
			lastOtp.current?.forceFocus(false);
			props.submit?.(newValue);
			lastOtp.current?.forceFocus(undefined);
		}
	};

	useImperativeHandle(ref, () => ({
		studentId: value,
		setStudentId: setValue,
	}));

	return (
		<InputOTP
			value={value}
			onChange={onChange}
			onFocus={props.onFocus}
			onBlur={props.onBlur}
			maxLength={5}
			pattern={REGEXP_ONLY_DIGITS}
			autoFocus={props.autoFocus}
		>
			<InputOTPGroup>
				<InputOTPSlot index={0} className={props.className} />
				<InputOTPSlot index={1} className={props.className} />
				<InputOTPSlot index={2} className={props.className} />
				<InputOTPSlot index={3} className={props.className} />
				<InputOTPSlot index={4} className={props.className} />
			</InputOTPGroup>
		</InputOTP>
	);
});

InputStudentId.displayName = "InputStudentId";
