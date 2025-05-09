import { InputOTPSlot, InputOTP, InputOTPGroup } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import React, { useEffect, useState } from 'react';

export interface InputIdProps {
    value: string | undefined;
    onChange: (_: string) => void;
}

export function InputId({ value, onChange }: InputIdProps) {
    useEffect(() => {
        if (value?.toString().length == 0 || value == undefined)
            (document.querySelector('input[autocomplete="one-time-code"]')! as HTMLInputElement).focus();
    });

    return (
        <InputOTP maxLength={5} pattern={REGEXP_ONLY_DIGITS} value={value} onChange={onChange}>
            <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
            </InputOTPGroup>
        </InputOTP>
    );
}

export function InputPassword({ submit }: { submit: (_: string) => void }) {
    const [password, setPassword] = useState('');

    const onSubmit = (ev: React.FormEvent) => {
        ev.preventDefault();
        submit(password);
        setPassword('');
    };

    return (
        <form onSubmit={onSubmit}>
            <Input type='password' value={password} onChange={(ev) => { setPassword(ev.target.value); }} />
        </form>
    );
}
