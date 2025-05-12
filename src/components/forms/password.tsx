import { MaybeLoading } from '@components/util/suspenseful';
import { ApiClient, apiToast } from '@lib/api';
import { useStatefulPromise } from '@lib/stateful-promise';
import { useSession } from '@lib/storage';
import { Credenza, CredenzaBody, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle } from '@ui/credenza';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@ui/input-otp';
import { useEffect, useState } from 'react';

export interface InputPasswordProps {
    value: string;
    setValue: (value: string) => void;
    submit?: (password: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    forceUnfocus?: boolean;
    className?: string;
    autoFocus?: boolean;
}

const Dot = '●';

export function InputPassword({ value, setValue, submit, onFocus, onBlur, forceUnfocus, className, autoFocus }: InputPasswordProps) {
    const [dots, setDots] = useState('');

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
            submit?.(password);
        }
    };

    useEffect(() => {
        setDots(value.replace(/./g, Dot));
    }, [value]);

    return (
        <InputOTP
            value={dots}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            maxLength={8}
            autoFocus={autoFocus}
        >
            <InputOTPGroup>
                <InputOTPSlot index={0} className={className} />
                <InputOTPSlot index={1} className={className} />
                <InputOTPSlot index={2} className={className} />
                <InputOTPSlot index={3} className={className} />
                <InputOTPSlot index={4} className={className} />
                <InputOTPSlot index={5} className={className} />
                <InputOTPSlot index={6} className={className} />
                <InputOTPSlot index={7} className={className} forceUnfocus={forceUnfocus} />
            </InputOTPGroup>
        </InputOTP>
    );
}

export function PasswordOverlay() {
    const { value: enckey, set: setEncKey } = useSession('enckey');
    const [modalOpen, setModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordOk, checkPassword] = useStatefulPromise(
        (password: string) => ApiClient.alias('login', { password }),
        apiToast,
    );
    useEffect(() => {
        if (!enckey.isSome()) setModalOpen(true);
        else setModalOpen(false);
    }, [enckey]);

    const handlePasswordSubmit = (password: string) => {
        checkPassword(password).then((res) => {
            if (!res.isOk()) {
                setPassword('');
                return;
            }

            setEncKey(password);
            setModalOpen(false);
        });
    };

    return (
        <Credenza open={modalOpen}>
            <CredenzaContent>
                <CredenzaHeader>
                    <CredenzaTitle>Enter Password</CredenzaTitle>
                    <CredenzaDescription>
                        Please enter the admin password to continue
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody>
                    <div className='flex flex-col w-full items-center justify-center mt-4 max-md:mb-6'>
                        <InputPassword
                            value={password}
                            setValue={setPassword}
                            submit={handlePasswordSubmit}
                            className='w-11 h-11 max-md:w-9 max-md:h-9'
                        />
                        <div className='absolute translate-x-54'>
                            <MaybeLoading
                                state={passwordOk}
                                width='2rem'
                                height='2rem'
                            />
                        </div>
                    </div>
                </CredenzaBody>
            </CredenzaContent>
        </Credenza>
    );
}
