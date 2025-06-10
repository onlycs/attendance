'use client';

import { InputStudentId, InputStudentIdRef } from '@components/forms/studentId';
import { useRecolor } from '@components/util/recolor';
import { MaybeLoading } from '@components/util/suspenseful';
import { AnyError, ApiClient, apiToast, HourType, RosterAction } from '@lib/api';
import { useStatefulPromise } from '@lib/stateful-promise';
import { Button } from '@ui/button';
import { Credenza, CredenzaBody, CredenzaContent, CredenzaDescription, CredenzaFooter, CredenzaHeader, CredenzaTitle } from '@ui/credenza';
import { Label } from '@ui/label';
import { err, ok, ResultAsync } from 'neverthrow';
import { useCookies } from 'next-client-cookies';
import { useParams } from 'next/navigation';
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { EncryptionKey, TokenKey, useRequireStorage, useSession } from '@lib/storage';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ui/form';
import { Input } from '@ui/input';
import { AsteriskIcon } from 'lucide-react';
import { makeWebsocket } from '@lib/zodws/api';
import { JsonDb, StudentData } from '@lib/jsondb';
import * as crypt from '@lib/crypt';

const RegisterFormSchema = z.object({
    first: z.string().regex(/^[A-Z]([A-Za-z]|-)+$/, {
        message: 'Must begin with a capital letter, and can only contain letters and dashes.',
    }),
    mi: z.string()
        .max(1, { message: 'Must be a single, capital letter.' })
        .regex(/^[A-Z]$/, { message: 'Must be a single, capital letter.' })
        .or(z.literal(''))
        .optional(),
    last: z.string().regex(/^[A-Z]([A-Za-z]|-)+( ([IVX]+|Jr|Sr))?$/, {
        message: 'Must begin with a capital letter, and can only contain letters and dashes, as well as a suffix.',
    }),
});

interface RegisterFormProps {
    onRegister: (data: z.TypeOf<typeof RegisterFormSchema>) => void;
}

function RegisterForm({ onRegister }: RegisterFormProps) {
    const form = useForm<z.TypeOf<typeof RegisterFormSchema>>({
        resolver: zodResolver(RegisterFormSchema),
        mode: 'all',
    });

    const onSubmit = (data: z.TypeOf<typeof RegisterFormSchema>) => {
        onRegister(data);
        form.reset();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
                <div className='flex flex-row w-full gap-2'>
                    <FormField
                        control={form.control}
                        name='first'
                        render={({ field }) => (
                            <FormItem className='w-[80%]'>
                                <FormLabel className='flex flex-row items-center h-4'>
                                    First Name
                                    <AsteriskIcon className='text-red-500 ml-1' size='1.15rem' />
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder='John' {...field} />
                                </FormControl>
                                <FormMessage className='text-red-500' />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='mi'
                        render={({ field }) => (
                            <FormItem className='w-[20%]'>
                                <FormLabel className='flex h-4 items-center'>M.I.</FormLabel>
                                <FormControl>
                                    <Input placeholder='Q' {...field} />
                                </FormControl>
                                <FormMessage className='text-red-500' />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name='last'
                    render={({ field }) => (
                        <FormItem className='w-full'>
                            <FormLabel className='flex flex-row items-center h-4'>
                                Last Name
                                <AsteriskIcon className='text-red-500 ml-1' size='1.15rem' />
                            </FormLabel>
                            <FormControl>
                                <Input placeholder='Doe' {...field} />
                            </FormControl>
                            <FormMessage className='text-red-500' />
                        </FormItem>
                    )}
                />

                <Button type='submit' className='mt-4' variant='primary'>Submit</Button>
            </form>
        </Form>
    );
}

interface TitleProps {
    mode: HourType;
}

function Title({ mode }: TitleProps) {
    const FullNames = {
        'learning': 'Learning Days',
        'build': 'Build Season',
        'demo': 'Demos',
    } as Record<HourType, string>;

    return (
        <Label className='text-2xl font-bold'>
            {FullNames[mode]}
        </Label>
    );
}

interface ModalsProps extends RegisterFormProps {
    roster: (force?: boolean) => void;
    clearStudentId: () => void;
}

interface ModalsRef {
    showForce: () => void;
    showRegister: () => void;
}

const Modals = React.forwardRef<ModalsRef, ModalsProps>((props, ref) => {
    const [force, setForce] = useState(false);
    const [register, setRegister] = useState(false);

    useImperativeHandle(ref, () => ({
        showForce: () => setForce(true),
        showRegister: () => setRegister(true),
    }));

    return (
        <>
            <Credenza open={force} closable={false}>
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Are you sure?</CredenzaTitle>
                        <CredenzaDescription>You signed in less than three minutes ago</CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaFooter className='md:mt-4 h-12 flex flex-row max-md:h-24'>
                        <Button
                            onClick={() => {
                                props.clearStudentId();
                                setForce(false);
                            }}
                            className='w-[35%] h-full'
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setForce(false);
                                props.roster(true);
                            }}
                            variant='error'
                            className='w-[65%] h-full'
                        >
                            Sign me out anyways!
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>

            <Credenza open={register} closable={false}>
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Welcome!</CredenzaTitle>
                        <CredenzaDescription>You&apos;re new here. Fill this out to sign in</CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <RegisterForm
                            onRegister={(data) => {
                                setRegister(false);
                                props.onRegister(data);
                            }}
                        />
                    </CredenzaBody>
                    <CredenzaFooter className='h-10 flex flex-row max-md:h-20'>
                        <Button className='w-full h-full' variant='error'>I entered my ID wrong</Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
});

Modals.displayName = 'Modals';

export default function Roster() {
    // -- cookies, page params
    const { mode } = useParams() as unknown as TitleProps;
    const cookies = useCookies();
    const { value: password } = useSession(EncryptionKey);
    const canLoad = useRequireStorage([
        { key: TokenKey },
        { key: EncryptionKey, type: 'session', redirectTo: '/admin' },
    ]);

    // -- form handling
    const [rosterData, rosterApi] = useStatefulPromise(
        ([id, force]: [string, boolean]) => {
            return new ResultAsync((async () => {
                const exists = await ApiClient.alias('studentExists', { params: { id } });
                if (!exists.isOk()) return err(exists.error as AnyError);
                if (!exists.value) return ok({ register: true, denied: false, action: 'login' as RosterAction });

                const res = await ApiClient.alias(
                    'roster',
                    { id, kind: mode, force },
                    { headers: { Authorization: cookies.get(TokenKey)! } },
                );

                if (!res.isOk()) return err(res.error as AnyError);
                return ok({ register: false, ...res.value });
            })());
        },
        apiToast,
    );

    // websocketing
    const [studentData, setStudentData] = useState<JsonDb<typeof StudentData> | null>(null);
    const ws = useMemo(() => {
        return makeWebsocket({
            messages: {
                StudentData: (_, data) => {
                    if (!data) {
                        setStudentData(new JsonDb(StudentData, []));
                    } else {
                        crypt
                            .decrypt(data, password.unwrap(''))
                            .then(decrypted => setStudentData(new JsonDb(StudentData, JSON.parse(decrypted || '[]'))))
                            .catch(toast.error);
                    }
                },
                Error: (_, error) => toast.error(error.message),
            },
        });
    }, []); // eslint-disable-line

    // ui
    const idForm = useRef<InputStudentIdRef>(null);
    const modals = useRef<ModalsRef>(null);
    const recolor = useRecolor();

    const roster = (force = false) => {
        rosterApi([idForm.current!.studentId, force]).then((res) => {
            if (!res.isOk()) return;

            if (res.value.register) {
                modals.current?.showRegister();
                return;
            }

            if (res.value.denied) {
                modals.current?.showRegister();
                return;
            }

            clearId();

            switch (res.value.action) {
                case 'login': return recolor('success');
                case 'logout': return recolor('error');
            }
        });
    };

    const clearId = () => {
        idForm.current?.setStudentId('');
    };

    const register = (data: z.TypeOf<typeof RegisterFormSchema>) => {
        studentData!.insert({
            id: idForm.current!.studentId,
            ...data,
        });

        const serialized = studentData!.serialize();

        if (!password.isSome()) {
            return;
        }

        crypt.encrypt(serialized, password.unwrap())
            .then(encrypted => ws!.send('Update', {
                sub: 'StudentData',
                value: encrypted,
            }))
            .catch(toast.error);

        roster();
    };

    useEffect(() => {
        ws!.send('Subscribe', 'StudentData');
    }, []); // eslint-disable-line

    if (!canLoad) {
        return <></>;
    }

    return (
        <>
            <Modals roster={roster} clearStudentId={clearId} onRegister={register} ref={modals} />

            <div className='absolute flex justify-center items-center top-[10vh] w-full m-auto'>
                <Title mode={mode} />
            </div>

            <InputStudentId
                ref={idForm}
                className='w-24 h-24 text-2xl'
                submit={() => roster()}
            />

            <div className='md:absolute md:translate-x-66 max-md:mt-8'>
                <MaybeLoading
                    state={rosterData}
                    width='2rem'
                    height='2rem'
                />
            </div>
        </>
    );
}
