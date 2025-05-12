'use client';

import { ThreeBtn } from '@components/pages/threebtn';
import { EncryptionKey, TokenKey, useRequireStorage } from '@lib/storage';
import { BookTextIcon, ChevronLeft, HandshakeIcon, WrenchIcon } from 'lucide-react';

export default function Attendance() {
    const canLoad = useRequireStorage([
        { key: TokenKey },
        { key: EncryptionKey, type: 'session', redirectTo: '/admin' },
    ]);

    const isLearning = new Date().getMonth() >= 8;

    if (!canLoad) return <></>;

    return (
        <ThreeBtn
            targets={[
                {
                    title: 'Back',
                    icon: <ChevronLeft className='max-md:mb-6 size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52' strokeWidth={1} />,
                    link: '/admin',
                },
                {
                    title: isLearning ? 'Learning Days' : 'Build Hours',
                    icon: isLearning
                        ? <BookTextIcon className='max-md:mb-6 size-24 md:size-28 lg:size-32 xl:size-38 2xl:size-48' strokeWidth={1} />
                        : <WrenchIcon className='max-md:mb-6 size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52' strokeWidth={1} />,
                    link: isLearning ? '/attendance/learning' : '/attendance/build',
                },
                {
                    title: 'Demo Hours',
                    icon: <HandshakeIcon className='max-md:mb-6 size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52' strokeWidth={1} />,
                    link: '/attendance/demo',
                },
            ]}
        />
    );
}
