"use client";

import type { InputStudentIdRef } from "@components/forms/studentId";
import { InputStudentId } from "@components/forms/studentId";
import { MaybeLoading } from "@components/util/suspenseful";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AnyError, HourType } from "@lib/api";
import { ApiClient, apiToast } from "@lib/api";
import * as crypt from "@lib/crypt";
import { JsonDb, StudentData } from "@lib/jsondb";
import { None, type Option, Some } from "@lib/optional";
import { useStatefulPromise } from "@lib/stateful-promise";
import {
	EncryptionKey,
	TokenKey,
	useRequireStorage,
	useSession,
} from "@lib/storage";
import { makeWebsocket } from "@lib/zodws/api";
import { Button } from "@ui/button";
import {
	Credenza,
	CredenzaBody,
	CredenzaContent,
	CredenzaDescription,
	CredenzaFooter,
	CredenzaHeader,
	CredenzaTitle,
} from "@ui/credenza";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/form";
import { Input } from "@ui/input";
import { Label } from "@ui/label";
import { AsteriskIcon } from "lucide-react";
import { err, ok, ResultAsync } from "neverthrow";
import { useParams } from "next/navigation";
import { useCookies } from "next-client-cookies";
import React, {
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const RegisterFormSchema = z.object({
	first: z.string().regex(/^[A-Z]([A-Za-z]|-)+$/, {
		message:
			"Must begin with a capital letter, and can only contain letters and dashes.",
	}),
	mi: z
		.string()
		.max(1, { message: "Must be a single, capital letter." })
		.regex(/^[A-Z]$/, { message: "Must be a single, capital letter." })
		.or(z.literal(""))
		.optional(),
	last: z.string().regex(/^[A-Z]([A-Za-z]|-)+( ([IVX]+|Jr|Sr))?$/, {
		message:
			"Must begin with a capital letter, and can only contain letters and dashes, as well as a suffix.",
	}),
});

interface RegisterFormProps {
	onRegister: (data: z.TypeOf<typeof RegisterFormSchema>) => void;
}

function RegisterForm({ onRegister }: RegisterFormProps) {
	const form = useForm<z.TypeOf<typeof RegisterFormSchema>>({
		resolver: zodResolver(RegisterFormSchema),
		mode: "all",
	});

	const onSubmit = (data: z.TypeOf<typeof RegisterFormSchema>) => {
		onRegister(data);
		form.reset();
	};

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col gap-4"
			>
				<div className="flex flex-row w-full gap-2">
					<FormField
						control={form.control}
						name="first"
						render={({ field }) => (
							<FormItem className="w-[80%]">
								<FormLabel className="flex flex-row items-center h-4">
									First Name
									<AsteriskIcon className="text-red-500 ml-1" size="1.15rem" />
								</FormLabel>
								<FormControl>
									<Input placeholder="John" {...field} />
								</FormControl>
								<FormMessage className="text-red-500" />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="mi"
						render={({ field }) => (
							<FormItem className="w-[20%]">
								<FormLabel className="flex h-4 items-center">M.I.</FormLabel>
								<FormControl>
									<Input placeholder="Q" {...field} />
								</FormControl>
								<FormMessage className="text-red-500" />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="last"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel className="flex flex-row items-center h-4">
								Last Name
								<AsteriskIcon className="text-red-500 ml-1" size="1.15rem" />
							</FormLabel>
							<FormControl>
								<Input placeholder="Doe" {...field} />
							</FormControl>
							<FormMessage className="text-red-500" />
						</FormItem>
					)}
				/>

				<Button type="submit" className="mt-4" variant="primary">
					Submit
				</Button>
			</form>
		</Form>
	);
}

interface TitleProps {
	mode: HourType;
}

function Title({ mode }: TitleProps) {
	const FullNames = {
		learning: "Learning Days",
		build: "Build Season",
		demo: "Demos",
	} as Record<HourType, string>;

	return <Label className="text-2xl font-bold">{FullNames[mode]}</Label>;
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
						<CredenzaDescription>
							You signed in less than three minutes ago
						</CredenzaDescription>
					</CredenzaHeader>
					<CredenzaFooter className="md:mt-4 h-12 flex flex-row max-md:h-24">
						<Button
							onClick={() => {
								props.clearStudentId();
								setForce(false);
							}}
							className="w-[35%] h-full"
						>
							Cancel
						</Button>
						<Button
							onClick={() => {
								setForce(false);
								props.roster(true);
							}}
							variant="error"
							className="w-[65%] h-full"
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
						<CredenzaDescription>
							You&apos;re new here. Fill this out to sign in
						</CredenzaDescription>
					</CredenzaHeader>
					<CredenzaBody>
						<RegisterForm
							onRegister={(data) => {
								setRegister(false);
								props.onRegister(data);
							}}
						/>
					</CredenzaBody>
					<CredenzaFooter className="h-10 flex flex-row max-md:h-20">
						<Button
							className="w-full h-full"
							variant="error"
							onClick={() => {
								setRegister(false);
								props.clearStudentId();
							}}
						>
							I entered my ID wrong
						</Button>
					</CredenzaFooter>
				</CredenzaContent>
			</Credenza>
		</>
	);
});

Modals.displayName = "Modals";

export default function Roster() {
	// -- cookies, page params
	const { mode } = useParams() as unknown as TitleProps;
	const cookies = useCookies();
	const { value: password } = useSession(EncryptionKey);
	const canLoad = useRequireStorage([
		{ key: TokenKey },
		{ key: EncryptionKey, type: "session", redirectTo: "/admin" },
	]);

	// -- form handling
	const [rosterData, rosterApi] = useStatefulPromise(
		([id, force]: [string, boolean]) => {
			return new ResultAsync(
				(async () => {
					if (!studentData.isSome()) {
						return ok({
							register: false,
							denied: true,
							action: "login",
						});
					}

					if (!studentData.value.get({ id })) {
						return ok({
							register: true,
							denied: false,
							action: "login",
						});
					}

					const res = await ApiClient.alias(
						"roster",
						{ id, kind: mode, force },
						{ headers: { Authorization: cookies.get(TokenKey) ?? "unknown" } },
					);

					if (!res.isOk()) return err(res.error as AnyError);
					return ok({ register: false, ...res.value });
				})(),
			);
		},
		apiToast,
	);

	// websocketing
	const [studentData, setStudentData] =
		useState<Option<JsonDb<typeof StudentData>>>(None);

	// biome-ignore lint/correctness/useExhaustiveDependencies: websocket is stable, no need to recreate
	const ws = useMemo(() => {
		return makeWebsocket({
			messages: {
				StudentData: (_, data) => {
					if (!data) {
						setStudentData(Some(new JsonDb(StudentData, [])));
					} else {
						crypt
							.decrypt(data, password.unwrap(""))
							.then((decrypted) => {
								setStudentData(
									Some(new JsonDb(StudentData, JSON.parse(decrypted || "[]"))),
								);
							})
							.catch(toast.error);
					}
				},
				Error: (_, error) => toast.error(error.message),
			},
		});
	}, []);

	// ui
	const idForm = useRef<InputStudentIdRef>(null);
	const modals = useRef<ModalsRef>(null);

	const roster = (id?: string, force = false) => {
		const studentId = id ?? idForm.current?.studentId;

		if (studentId === undefined) {
			toast.error("Form is not ready yet.");
			return;
		}

		rosterApi([studentId, force]).then((res) => {
			if (!res.isOk()) return;

			if (res.value.register) {
				modals.current?.showRegister();
				return;
			}

			if (res.value.denied) {
				modals.current?.showForce();
				return;
			}

			clearId();

			switch (res.value.action) {
				case "login":
					toast.success("You have successfully signed in!");
					break;
				case "logout":
					toast.success("You have successfully signed out!");
					break;
			}
		});
	};

	const clearId = () => {
		idForm.current?.setStudentId("");
	};

	const register = (data: z.TypeOf<typeof RegisterFormSchema>) => {
		if (!studentData.isSome()) {
			toast.error("Student data is not loaded yet.");
			return;
		}

		if (!idForm.current?.studentId) {
			toast.error("You must enter a student ID first.");
			return;
		}

		studentData.value.insert({
			id: idForm.current.studentId,
			...data,
		});

		const serialized = studentData.value.serialize();

		if (!password.isSome()) {
			return;
		}

		crypt
			.encrypt(serialized, password.unwrap())
			.then((encrypted) =>
				ws.send("Update", {
					sub: "StudentData",
					value: encrypted,
				}),
			)
			.catch(toast.error);

		roster();
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: websocket is not a dependency
	useEffect(() => {
		ws.send("Subscribe", {
			token: cookies.get(TokenKey) ?? "unknown",
			sub: "StudentData",
		});
	}, []);

	if (!canLoad) {
		return <></>;
	}

	return (
		<>
			<Modals
				roster={(force) => roster(undefined, force)}
				clearStudentId={clearId}
				onRegister={register}
				ref={modals}
			/>

			<div className="absolute flex justify-center items-center top-[10vh] w-full m-auto">
				<Title mode={mode} />
			</div>

			<InputStudentId
				ref={idForm}
				className="w-24 h-24 text-2xl"
				submit={(id) => roster(id)}
			/>

			<div className="md:absolute md:translate-x-66 max-md:mt-8">
				<MaybeLoading state={rosterData} width="2rem" height="2rem" />
			</div>
		</>
	);
}
