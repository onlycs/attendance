'use client';

import { CardAnim, CardAnimInv } from '@app/admin/page';
import { FocusCards } from '@ui/focus-cards';
import { AnimatePresence } from 'framer-motion';
import { CalendarClock, HourglassIcon, LogOutIcon } from 'lucide-react';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Student() {
    const router = useRouter();
    const cookies = useCookies();

    useEffect(() => {
        router.prefetch('/student/hours');
        router.prefetch('/student/request');
        router.prefetch('/');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className='flex flex-col items-center justify-center w-full h-full'>
            <AnimatePresence>
                <FocusCards
                    cards={[
                        {
                            title: 'Check Hours',
                            icon: <HourglassIcon className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} />,
                            motion: CardAnim,
                            onClick: () => router.push('/student/hours'),
                        },
                        {
                            title: 'Change Request',
                            icon: <CalendarClock className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} />,
                            motion: CardAnimInv,
                            onClick: () => router.push('/student/request'),
                        },
                        {
                            title: 'Log Out',
                            icon: <LogOutIcon className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} color='red' />,
                            motion: CardAnim,
                            onClick() {
                                cookies.remove('studentId');
                                router.push('/');
                            },
                        },
                    ]}
                />
            </AnimatePresence>
        </div>
    );
}
