'use client';

import { EncryptionKey, TokenKey, useRequireStorage } from '@lib/storage';

export default function Attendance() {
    const canLoad = useRequireStorage([
        { key: TokenKey },
        { key: EncryptionKey, type: 'session', redirectTo: '/admin' },
    ]);

    if (!canLoad) return <></>;

    return <>test</>;
}
