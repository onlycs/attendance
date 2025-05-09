'use client';

import { useRouter } from 'next/navigation';

import React, { useEffect, useState } from 'react';
import { GraduationCap, UserIcon } from 'lucide-react';
import { Label } from '@ui/label';
import { Separator } from '@ui/separator';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import { InputOTPGroup, InputOTPSlot } from '@ui/input-otp';
import type { AnimationControls } from 'framer-motion';
import { motion, useAnimationControls } from 'framer-motion';
import { useStatefulPromise } from '@lib/statefulpromise';
import { ApiClient, apiResult, apiToast } from '@lib/api';
import { cn } from '@lib/utils';
import { MaybeLoading } from '@components/util/suspenseful';
import { useCookies } from 'next-client-cookies';

function LabeledAdmin({ controls }: { controls: AnimationControls }) {
    return (
        <motion.div
            animate={controls}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className='h-[6.5vh] w-[6.5vw] flex flex-col gap-[0.75vh] items-center justify-center'
        >
            <UserIcon />
            <Label htmlFor='admin' className='text-xs'>
                Admin
            </Label>
        </motion.div>
    );
}

function LabeledStudent({ controls }: { controls: AnimationControls }) {
    return (
        <motion.div
            animate={controls}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className='h-[6.5vh] w-[6.5vw] flex flex-col gap-[0.75vh] items-center justify-center'
        >
            <GraduationCap />
            <Label htmlFor='student' className='text-xs'>
                Student
            </Label>
        </motion.div>
    );
}

export default function Home() {
    const router = useRouter();
    const cookies = useCookies();

    const topctl = useAnimationControls();
    const bottomctl = useAnimationControls();
    const barctl = useAnimationControls();
    const adminctl = useAnimationControls();
    const studentctl = useAnimationControls();
    const headerctl = useAnimationControls();

    const [active, setActive] = useState<'top' | 'bottom'>('top');
    const [mouse, setMouse] = useState(true);
    const [inOutbound, setInOutbound] = useState(false);

    const [above, setAbove] = useState('');
    const [aboveDots, setAboveDots] = useState('');
    const [below, setBelow] = useState('');

    const [tokenInfo, signin] = useStatefulPromise(
        (password: string) => apiResult(ApiClient.login({ password })),
        apiToast,
    );

    const handleAboveChange = (value: string) => {
        const dot = '•';
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

            signin(password).then((res) => {
                if (res.isErr()) {
                    setInOutbound(false);
                    return;
                };

                const token = res.value.token;
                cookies.set('token', token);

                const transition = { duration: 0.5, ease: 'easeInOut' } as const;
                const promises: Promise<void>[] = [];

                promises.push(adminctl.start({ scale: 0.65, x: '-1vw', opacity: 0 }, transition));
                promises.push(studentctl.start({ scale: 0.65, x: '-1vw', opacity: 0 }, transition));
                promises.push(headerctl.start({ y: '-5rem', opacity: 0 }, transition));
                promises.push(barctl.start({ opacity: 0 }, transition));
                promises.push(bottomctl.start({ y: '50vh', opacity: 0 }, transition));
                promises.push(topctl.start({ y: '-50vh', opacity: 0 }, transition));

                Promise.all(promises).then(() => {
                    router.push('/home');
                }).catch(console.error);
            });
        }
    };

    useEffect(() => {
        if (inOutbound) return;

        topctl.start({ opacity: 1, y: 0 }).catch(console.error);
        bottomctl.start({ opacity: 1, y: 0 }).catch(console.error);
        barctl.start({ opacity: 1 }).catch(console.error);
    });

    useEffect(() => {
        if (inOutbound) return;

        if (active == 'top') {
            adminctl.start({ x: '10vw', y: '3.25vh', scale: 1.25, opacity: 1 }).catch(console.error);
            studentctl.start({ x: '0', y: '3.125vh', scale: 0.65, opacity: 0.25 }).catch(console.error);
            barctl.start({ y: '4.25vh', scale: 0.75, opacity: 0.5 }).catch(console.error);
            bottomctl.start({ y: '3.525vh', scale: 0.75, opacity: 0.5 }).catch(console.error);
            topctl.start({ y: '3.125vh', scale: 1.75 }).catch(console.error);
        } else {
            adminctl.start({ x: '0', y: '-3.125vh', scale: 0.65, opacity: 0.25 }).catch(console.error);
            studentctl.start({ x: '18vw', y: '-3.25vh', scale: 1.25, opacity: 1 }).catch(console.error);
            barctl.start({ y: '-4.25vh', scale: 0.75, opacity: 0.5 }).catch(console.error);
            topctl.start({ y: '-3.125vh', scale: 0.75, opacity: 0.5 }).catch(console.error);
            bottomctl.start({ y: '-3.525vh', scale: 1.75 }).catch(console.error);
        }
    });

    return (
        <div className='flex flex-row gap-[3vw] w-full'>
            <motion.div className='absolute flex justify-center items-center top-[10vh] w-full m-auto' animate={headerctl}>
                <Label className='text-2xl font-bold'>Log In</Label>
            </motion.div>

            <div
                className={cn(
                    'absolute w-screen top-0',
                    active == 'top' ? 'h-[54vh]' : 'h-[46vh]',
                )}
                onMouseEnter={() => { if (mouse) setActive('top'); }}
            />

            <div
                className={cn(
                    'absolute w-screen bottom-0',
                    active == 'bottom' ? 'h-[54vh]' : 'h-[46vh]',
                )}
                onMouseEnter={() => { if (mouse) setActive('bottom'); }}
            />

            <div className='flex flex-col w-[10vw] justify-center items-center'>
                <LabeledAdmin controls={adminctl} />
                <LabeledStudent controls={studentctl} />
            </div>

            <div className='flex flex-col gap-[1.5vh] items-center justify-center w-[90vw] mr-[11.25vw]'>
                <motion.div
                    initial={{ opacity: 0, y: -25 }}
                    animate={topctl}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className='flex flex-row justify-center items-center gap-[1.5vw]'
                >
                    <OTPInput
                        value={aboveDots}
                        onChange={handleAboveChange}
                        maxLength={8}
                        onFocus={() => {
                            setMouse(false);
                            setActive('top');
                        }}
                        onBlur={() => { setMouse(true); }}
                    >
                        <InputOTPGroup className='w-full flex justify-center items-center'>
                            <InputOTPSlot index={0} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={1} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={2} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={3} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={4} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={5} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={6} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={7} className='w-[3.25vh] h-[3.25vh]' forceUnfocus={inOutbound} />
                        </InputOTPGroup>
                    </OTPInput>
                    <div className='absolute ml-[31.5vw]'>
                        <MaybeLoading
                            state={active == 'top' ? tokenInfo : undefined}
                            width='1.75vh'
                            height='1.75vh'
                        />
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={barctl}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className='w-82'
                >
                    <Separator />
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    animate={bottomctl}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className='flex flex-row justify-center'
                >
                    <OTPInput
                        value={below}
                        onChange={setBelow}
                        maxLength={5}
                        pattern={REGEXP_ONLY_DIGITS}
                        onFocus={() => {
                            setMouse(false);
                            setActive('bottom');
                        }}
                        onBlur={() => { setMouse(true); }}
                    >
                        <InputOTPGroup className='w-full flex justify-center items-center'>
                            <InputOTPSlot index={0} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={1} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={2} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={3} className='w-[3.25vh] h-[3.25vh]' />
                            <InputOTPSlot index={4} className='w-[3.25vh] h-[3.25vh]' forceUnfocus={inOutbound} />
                        </InputOTPGroup>
                    </OTPInput>
                </motion.div>
            </div>
        </div>
    );
}
