'use client';

import { useSession } from '@lib/storage';
import { FocusCards } from '@ui/focus-cards';
import { AnimatePresence } from 'framer-motion';
import { ClockIcon, LogOutIcon, Table2Icon } from 'lucide-react';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const CardAnim = {
    initial: { y: '-60vh', scale: 0.5, opacity: 0 },
    animate: { y: 0, scale: 1, opacity: 1 },
    exit: { y: '60vh', scale: 0.5, opacity: 0 },
    transition: { duration: 0.5, ease: 'easeInOut' },
    whileHover: { scale: 1.05, y: -10, transition: { duration: 0.1 } },
};

export const CardAnimInv = {
    ...CardAnim,
    initial: { ...CardAnim.initial, y: '60vh' },
    exit: { ...CardAnim.exit, y: '-60vh' },
};

export default function Home() {
    const router = useRouter();
    const cookies = useCookies();
    const { delete: deleteEnckey } = useSession('enckey');

    useEffect(() => {
        router.prefetch('/admin/editor');
        router.prefetch('/attendance');
        router.prefetch('/');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className='flex flex-col items-center justify-center w-full h-full'>
            <AnimatePresence>
                <FocusCards
                    cards={[
                        {
                            title: 'Hours Editor',
                            icon: <Table2Icon className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} />,
                            motion: CardAnim,
                            onClick: () => router.push('/admin/editor'),
                        },
                        {
                            title: 'Attendance',
                            icon: <ClockIcon className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} />,
                            motion: CardAnimInv,
                            onClick: () => router.push('/attendance'),
                        },
                        {
                            title: 'Log Out',
                            icon: <LogOutIcon className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} color='red' />,
                            motion: CardAnim,
                            onClick() {
                                cookies.remove('token');
                                deleteEnckey();
                                router.push('/');
                            },
                        },
                    ]}
                />
            </AnimatePresence>
        </div>
    );
}
