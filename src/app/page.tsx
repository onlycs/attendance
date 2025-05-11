'use client';

import { useRouter } from 'next/navigation';

import { ReactNode, useEffect, useState } from 'react';
import { GraduationCap, UserIcon } from 'lucide-react';
import { Label } from '@ui/label';
import { Separator } from '@ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@ui/input-otp';
import { motion, TargetAndTransition, useAnimationControls } from 'framer-motion';
import { useStatefulPromise } from '@lib/stateful-promise';
import { ApiClient, apiToast } from '@lib/api';
import { cn } from '@lib/utils';
import { MaybeLoading } from '@components/util/suspenseful';
import { useCookies } from 'next-client-cookies';
import { useMd } from '@lib/md';
import { defaultExt, AnimDefault } from '@lib/anim';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { toast } from 'sonner';
import { EncryptionKey, StudentIdKey, TokenKey, useRequireCookies, useSession } from '@lib/storage';

interface IconProps {
    className?: string;
    children: ReactNode;
    label: string;
}

function LabeledIcon({ className, children, label }: IconProps) {
    return (
        <div
            className={cn(
                'w-16 h-16 max-md:w-12 max-md:h-12 flex flex-col md:gap-2 items-center justify-center',
                className,
            )}
        >
            {children}
            <Label className='text-xs max-md:text-xl'>
                {label}
            </Label>
        </div>
    );
}

export default function Home() {
    const router = useRouter();
    const cookies = useCookies();
    const canLoad = useRequireCookies(
        [
            { key: TokenKey, redirectTo: '/admin', redirectOnMissing: false },
            { key: StudentIdKey, redirectTo: '/student', redirectOnMissing: false },
        ],
        cookies,
        router,
    );

    // -- animations
    const topctl = useAnimationControls();
    const bottomctl = useAnimationControls();
    const barctl = useAnimationControls();
    const headerctl = useAnimationControls();
    const [inOutbound, setInOutbound] = useState(false);

    // -- reactive animation switching
    const whileTop = useMd<TargetAndTransition[]>({
        sm: [{ y: '5rem' }, {}, { y: '30rem' }],
        md: [
            { y: '2.75rem', scale: 1.25, transition: { duration: 0.25 } },
            { opacity: 0.35, y: '3rem', scale: 0.85, transition: { duration: 0.25 } },
            { opacity: 0.35, y: '2.75rem', scale: 0.85, transition: { duration: 0.25 } },
        ],
    });

    const whileBottom = useMd<TargetAndTransition[]>({
        sm: [{ x: '40rem' }, {}, { y: '-15rem' }],
        md: [
            { opacity: 0.35, y: '-2.75rem', scale: 0.85, transition: { duration: 0.25 } },
            { opacity: 0.35, y: '-3rem', scale: 0.85, transition: { duration: 0.25 } },
            { y: '-2.75rem', scale: 1.25, transition: { duration: 0.25 } },
        ],
    });

    const whileNone = useMd<TargetAndTransition[]>({
        sm: [AnimDefault, AnimDefault, AnimDefault],
        md: [{ transition: { duration: 0.25 } }, { transition: { duration: 0.25 } }, { transition: { duration: 0.25 } }],
    });

    // -- form management
    const [active, setActive] = useState<'top' | 'bottom' | 'none'>('none');
    const [above, setAbove] = useState('');
    const [aboveDots, setAboveDots] = useState('');
    const [below, setBelow] = useState('');
    const { set: setEncryptionKey } = useSession(EncryptionKey);

    // -- fetching data
    const [adminToken, adminSignin] = useStatefulPromise(
        (password: string) => ApiClient.alias('login', { password }),
        apiToast,
    );

    const [studentExists, checkStudent] = useStatefulPromise(
        (id: string) => ApiClient.alias('studentExists', { params: { id } }),
        apiToast,
    );

    // -- animation runners: outbound
    const runOutboundAnimation = () => {
        const transition = { duration: 0.5, ease: 'easeInOut' } as const;
        const promises: Promise<void>[] = [];

        promises.push(headerctl.start({ y: '-5rem', opacity: 0 }, transition));
        promises.push(barctl.start({ opacity: 0 }, transition));
        promises.push(bottomctl.start({ y: '50rem', opacity: 0 }, transition));
        promises.push(topctl.start({ y: '-50rem', opacity: 0 }, transition));

        return new Promise(res => setTimeout(res, transition.duration * 1000));
    };

    // -- animation runners: active form
    useEffect(() => {
        if (inOutbound) return;

        const [top, bar, bottom] = {
            'top': whileTop,
            'bottom': whileBottom,
            'none': whileNone,
        }[active];

        topctl.start(defaultExt(top)).catch(console.error);
        barctl.start(defaultExt(bar)).catch(console.error);
        bottomctl.start(defaultExt(bottom)).catch(console.error);
    });

    // -- form change handlers
    const handleAboveChange = (value: string) => {
        const dot = '●';
        let password;

        if (value.endsWith(dot) || value == '') {
            password = above.slice(0, value.length - above.length);
            setAbove(password);
            setAboveDots(value.replace(/./g, dot));
        } else {
            password = above + value.slice(-1);
            setAbove(password);
            setAboveDots(value.replace(/./g, dot));
        }

        if (value.length == 8) {
            setInOutbound(true);

            adminSignin(password).then((res) => {
                if (res.isErr()) {
                    setInOutbound(false);
                    return;
                };

                const token = res.value.token;

                setEncryptionKey(password);
                cookies.set(TokenKey, token, { expires: new Date(res.value.expires) });

                runOutboundAnimation().then(() => {
                    router.push('/admin');
                }).catch(console.error);
            });
        }
    };

    const handleBelowChange = (id: string) => {
        setBelow(id);
        if (id.length == 5) {
            setInOutbound(true);

            checkStudent(id).then((res) => {
                if (res.isErr()) {
                    setInOutbound(false);
                    return;
                }

                if (!res.value) {
                    toast.warning('You don\'t have any hours yet! Check back once you\'ve signed in at least once');
                    setInOutbound(false);
                    return;
                }

                cookies.set(StudentIdKey, id);

                setInOutbound(true);
                runOutboundAnimation().then(() => {
                    router.push('/student');
                }).catch(console.error);
            });
        }
    };

    // -- prefetching
    useEffect(() => {
        router.prefetch('/admin');
        router.prefetch('/student');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!canLoad) return <></>;

    return (
        <div className='flex flex-row gap-[3vw] w-full'>
            <motion.div className='absolute flex justify-center items-center top-[10vh] w-full m-auto' animate={headerctl}>
                <Label className='text-2xl font-bold'>Log In</Label>
            </motion.div>

            <div className='flex flex-col gap-[1.5vh] items-center justify-center w-full'>
                <motion.div
                    animate={topctl}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className='flex md:flex-row max-md:flex-col max-md:mb-18 justify-center items-center'
                >
                    <LabeledIcon className='md:absolute md:-translate-x-68' label='Admin'>
                        <UserIcon className='hidden md:flex' />
                    </LabeledIcon>

                    <InputOTP
                        id='top'
                        value={aboveDots}
                        onChange={handleAboveChange}
                        maxLength={8}
                        inputMode='text'
                        onFocus={() => {
                            setActive('top');
                            setBelow('');
                        }}
                        onBlur={() => setActive('none')}
                    >
                        <InputOTPGroup className='w-full flex justify-center items-center max-md:mb-8'>
                            <InputOTPSlot index={0} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={1} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={2} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={3} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={4} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={5} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={6} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={7} className='w-14 h-14 max-md:w-12 max-md:h-12' forceUnfocus={inOutbound} />
                        </InputOTPGroup>
                    </InputOTP>

                    <div className='md:absolute md:translate-x-66'>
                        <MaybeLoading
                            state={active === 'top' ? adminToken : undefined}
                            width='2rem'
                            height='2rem'
                        />
                    </div>
                </motion.div>
                <motion.div
                    animate={barctl}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className='max-md:hidden w-82'
                >
                    <Separator />
                </motion.div>
                <motion.div
                    animate={bottomctl}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className='flex md:flex-row max-md:flex-col max-md:mt-18 justify-center items-center'
                    onFocus={() => {
                        setActive('bottom');
                        setAbove('');
                    }}
                    onBlur={() => setActive('none')}
                >
                    <LabeledIcon className='md:absolute md:-translate-x-68' label='Student'>
                        <GraduationCap className='hidden md:flex' />
                    </LabeledIcon>

                    <InputOTP
                        id='bottom'
                        value={below}
                        onChange={handleBelowChange}
                        maxLength={5}
                        pattern={REGEXP_ONLY_DIGITS}
                    >
                        <InputOTPGroup className='w-full flex justify-center items-center'>
                            <InputOTPSlot index={0} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={1} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={2} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={3} className='w-14 h-14 max-md:w-12 max-md:h-12' />
                            <InputOTPSlot index={4} className='w-14 h-14 max-md:w-12 max-md:h-12' forceUnfocus={inOutbound} />
                        </InputOTPGroup>
                    </InputOTP>

                    <div className='md:absolute md:translate-x-66 max-md:mt-8'>
                        <MaybeLoading
                            state={active === 'bottom' ? studentExists : undefined}
                            width='2rem'
                            height='2rem'
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
