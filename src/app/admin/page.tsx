'use client';

import { PasswordOverlay } from '@components/forms/password';
import { ThreeBtn } from '@components/pages/threebtn';
import { TokenKey, useRequireStorage, useSession } from '@lib/storage';
import { ClockIcon, LogOutIcon, Table2Icon } from 'lucide-react';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
    const router = useRouter();
    const cookies = useCookies();
    const canLoad = useRequireStorage([{ key: TokenKey }]);
    const { delete: deleteEnckey } = useSession('enckey');

    useEffect(() => {
        router.prefetch('/admin/editor');
        router.prefetch('/attendance');
        router.prefetch('/');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!canLoad) return <></>;

    return (
        <div className='flex flex-col items-center justify-center w-full h-full'>
            <PasswordOverlay />

            <ThreeBtn
                targets={[
                    {
                        title: 'Hours Editor',
                        icon: <Table2Icon className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} />,
                        link: '/admin/editor',
                    },
                    {
                        title: 'Attendance',
                        icon: <ClockIcon className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} />,
                        link: '/attendance',
                    },
                    {
                        title: 'Log Out',
                        icon: <LogOutIcon className='max-md:mb-6 size-24 md:size-32 lg:size-36 xl:size-42 2xl:size-52' strokeWidth={1} color='red' />,
                        onClick() {
                            cookies.remove('token');
                            deleteEnckey();
                        },
                    },
                ]}
            />
        </div>
    );
}
