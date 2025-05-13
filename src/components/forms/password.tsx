import { MaybeLoading } from '@components/util/suspenseful';
import { ApiClient, apiToast } from '@lib/api';
import { useStatefulPromise } from '@lib/stateful-promise';
import { useSession } from '@lib/storage';
import { Credenza, CredenzaBody, CredenzaContent, CredenzaHeader, CredenzaTitle } from '@ui/credenza';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSlotRef } from '@ui/input-otp';
import { useCookies } from 'next-client-cookies';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface InputPasswordRef {
    password: string;
    setPassword: (value: string) => void;
}

export interface InputPasswordProps {
    submit?: (password: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    className?: string;
    autoFocus?: boolean;
}

const Dot = '●';

export const InputPassword = React.forwardRef<InputPasswordRef, InputPasswordProps>((props, ref) => {
    const [dots, setDots] = useState('');
    const [value, setValuePrimitive] = useState('');
    const lastOtp = useRef<InputOTPSlotRef>(null);

    useImperativeHandle(ref, () => ({
        password: value,
        setPassword(value: string) {
            setValue(value);
            setDots(value.replace(/./g, Dot));
        },
    }));

    const setValue = (newValue: string) => {
        setValuePrimitive(newValue);
        setDots(newValue.replace(/./g, Dot));
    };

    const onChange = (newValue: string) => {
        let password;

        if (newValue.endsWith(Dot)) {
            password = value.slice(0, newValue.length - value.length);
            setValue(password);
        } else {
            password = value + newValue.slice(-1);
            setValue(password);
        }

        if (password.length === 8) {
            lastOtp.current?.forceFocus(false);
            props.submit?.(password);
            lastOtp.current?.forceFocus(undefined);
        }
    };

    return (
        <InputOTP
            value={dots}
            onChange={onChange}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            maxLength={8}
            autoFocus={props.autoFocus}
            inputMode='text'
        >
            <InputOTPGroup>
                <InputOTPSlot index={0} className={props.className} />
                <InputOTPSlot index={1} className={props.className} />
                <InputOTPSlot index={2} className={props.className} />
                <InputOTPSlot index={3} className={props.className} />
                <InputOTPSlot index={4} className={props.className} />
                <InputOTPSlot index={5} className={props.className} />
                <InputOTPSlot index={6} className={props.className} />
                <InputOTPSlot index={7} ref={lastOtp} className={props.className} />
            </InputOTPGroup>
        </InputOTP>
    );
});

InputPassword.displayName = 'InputPassword';

export interface PasswordOverlayRef extends Partial<InputPasswordRef> {
    setOpen: (open: boolean) => void;
}

export interface PasswordOverlayProps {
    redirect?: (to: string) => void;
}

export const PasswordOverlay = React.forwardRef<PasswordOverlayRef, PasswordOverlayProps>((props, ref) => {
    const { value: enckey, set: setEncKey } = useSession('enckey');
    const cookies = useCookies();

    const [modalOpen, setModalOpen] = useState(false);

    const passwordRef = useRef<InputPasswordRef>(null);
    const [passwordOk, checkPassword] = useStatefulPromise(
        (password: string) => ApiClient.alias('login', { password }),
        apiToast,
    );

    useImperativeHandle(ref, () => ({
        setOpen(open: boolean) {
            setModalOpen(open);
        },
        ...passwordRef.current,
    }));

    useEffect(() => {
        if (!enckey.isSome()) setModalOpen(true);
        else setModalOpen(false);
    }, [enckey]);

    const handlePasswordSubmit = (password: string) => {
        checkPassword(password).then((res) => {
            if (!res.isOk()) {
                passwordRef.current?.setPassword('');
                return;
            }

            setEncKey(password);
            setModalOpen(false);
        });
    };

    const handleCancel = (open: boolean) => {
        if (open || !props.redirect) return;

        cookies.remove('token');
        props.redirect('/');
        setModalOpen(false);
    };

    return (
        <Credenza open={modalOpen} onOpenChange={handleCancel}>
            <CredenzaContent>
                <CredenzaHeader>
                    <CredenzaTitle>Enter Admin Password</CredenzaTitle>
                </CredenzaHeader>
                <CredenzaBody>
                    <div className='flex flex-col w-full items-center justify-center mt-4 max-md:mb-8'>
                        <InputPassword
                            ref={passwordRef}
                            submit={handlePasswordSubmit}
                            className='w-11 h-11 max-md:w-9 max-md:h-9'
                        />
                        <div className='absolute translate-x-54 max-md:translate-x-44'>
                            <MaybeLoading
                                state={passwordOk}
                                width='1.75rem'
                                height='1.75rem'
                            />
                        </div>
                    </div>
                </CredenzaBody>
            </CredenzaContent>
        </Credenza>
    );
});

PasswordOverlay.displayName = 'PasswordOverlay';
