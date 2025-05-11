import { InputOTP, InputOTPGroup, InputOTPSlot } from '@ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

export interface InputStudentIdProps {
    value: string;
    setValue: (value: string) => void;
    submit?: (id: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    forceUnfocus?: boolean;
    className?: string;
    autoFocus?: boolean;
}

export function InputStudentId({ value, setValue, submit, onFocus, onBlur, forceUnfocus, className, autoFocus }: InputStudentIdProps) {
    const onChange = (newValue: string) => {
        setValue(newValue);

        if (newValue.length === 5) {
            submit?.(newValue);
        }
    };

    return (
        <InputOTP
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            maxLength={5}
            pattern={REGEXP_ONLY_DIGITS}
            autoFocus={autoFocus}
        >
            <InputOTPGroup>
                <InputOTPSlot index={0} className={className} />
                <InputOTPSlot index={1} className={className} />
                <InputOTPSlot index={2} className={className} />
                <InputOTPSlot index={3} className={className} />
                <InputOTPSlot index={4} className={className} forceUnfocus={forceUnfocus} />
            </InputOTPGroup>
        </InputOTP>
    );
}
