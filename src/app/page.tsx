"use client";

import type { InputPasswordRef } from "@components/forms/password";
import { InputPassword } from "@components/forms/password";
import type { InputStudentIdRef } from "@components/forms/studentId";
import { InputStudentId } from "@components/forms/studentId";
import { MaybeLoading } from "@components/util/suspenseful";
import { AnimDefault, defaultExt } from "@lib/anim";
import { ApiClient, apiToast } from "@lib/api";
import { useMd } from "@lib/md";
import { useStatefulPromise } from "@lib/stateful-promise";
import {
	EncryptionKey,
	StudentIdKey,
	TokenKey,
	useRequireStorage,
	useSession,
} from "@lib/storage";
import { cn } from "@lib/utils";
import { Label } from "@ui/label";
import { Separator } from "@ui/separator";
import type { TargetAndTransition } from "framer-motion";
import { motion, useAnimationControls } from "framer-motion";
import { GraduationCap, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCookies } from "next-client-cookies";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface IconProps {
	className?: string;
	children: ReactNode;
	label: string;
}

function LabeledIcon({ className, children, label }: IconProps) {
	return (
		<div
			className={cn(
				"w-16 h-16 max-md:w-12 max-md:h-12 flex flex-col md:gap-2 items-center justify-center",
				className,
			)}
		>
			{children}
			<Label className="text-xs max-md:text-xl">{label}</Label>
		</div>
	);
}

export default function Home() {
	const router = useRouter();
	const cookies = useCookies();
	const canLoad = useRequireStorage([
		{ key: TokenKey, redirectTo: "/admin", redirectIf: "found" },
		{ key: StudentIdKey, redirectTo: "/student", redirectIf: "found" },
	]);

	// -- animations
	const topctl = useAnimationControls();
	const bottomctl = useAnimationControls();
	const barctl = useAnimationControls();
	const headerctl = useAnimationControls();
	const [inOutbound, setInOutbound] = useState(false);

	// -- reactive animation switching
	const whileTop = useMd<TargetAndTransition[]>({
		sm: [{ y: "5rem" }, {}, { y: "30rem" }],
		md: [
			{ y: "2.75rem", scale: 1.25, transition: { duration: 0.25 } },
			{ opacity: 0.35, y: "3rem", scale: 0.85, transition: { duration: 0.25 } },
			{
				opacity: 0.35,
				y: "2.75rem",
				scale: 0.85,
				transition: { duration: 0.25 },
			},
		],
	});

	const whileBottom = useMd<TargetAndTransition[]>({
		sm: [{ x: "40rem" }, {}, { y: "-15rem" }],
		md: [
			{
				opacity: 0.35,
				y: "-2.75rem",
				scale: 0.85,
				transition: { duration: 0.25 },
			},
			{
				opacity: 0.35,
				y: "-3rem",
				scale: 0.85,
				transition: { duration: 0.25 },
			},
			{ y: "-2.75rem", scale: 1.25, transition: { duration: 0.25 } },
		],
	});

	const whileNone = useMd<TargetAndTransition[]>({
		sm: [AnimDefault, AnimDefault, AnimDefault],
		md: [
			{ transition: { duration: 0.25 } },
			{ transition: { duration: 0.25 } },
			{ transition: { duration: 0.25 } },
		],
	});

	// -- form management
	const [active, setActive] = useState<"top" | "bottom" | "none">("none");
	const topRef = useRef<InputPasswordRef>(null);
	const bottomRef = useRef<InputStudentIdRef>(null);

	const { set: setEncryptionKey } = useSession(EncryptionKey);

	// -- fetching data
	const [adminToken, adminSignin] = useStatefulPromise(
		(password: string) => ApiClient.alias("login", { password }),
		apiToast,
	);

	const [studentExists, checkStudent] = useStatefulPromise(
		(id: string) => ApiClient.alias("studentExists", { params: { id } }),
		apiToast,
	);

	// -- animation runners: outbound
	const runOutboundAnimation = () => {
		const transition = { duration: 0.5, ease: "easeInOut" } as const;
		const promises: Array<Promise<void>> = [];

		promises.push(headerctl.start({ y: "-5rem", opacity: 0 }, transition));
		promises.push(barctl.start({ opacity: 0 }, transition));
		promises.push(bottomctl.start({ y: "50rem", opacity: 0 }, transition));
		promises.push(topctl.start({ y: "-50rem", opacity: 0 }, transition));

		return new Promise((res) => setTimeout(res, transition.duration * 1000));
	};

	// -- animation runners: active form
	// biome-ignore lint/correctness/useExhaustiveDependencies: animation controllers are not dependencies.
	useEffect(() => {
		if (inOutbound) return;

		const [top, bar, bottom] = {
			top: whileTop,
			bottom: whileBottom,
			none: whileNone,
		}[active];

		topctl.start(defaultExt(top)).catch(console.error);
		barctl.start(defaultExt(bar)).catch(console.error);
		bottomctl.start(defaultExt(bottom)).catch(console.error);
	}, [active, whileTop, whileBottom, whileNone]);

	// -- form change handlers
	const submitAbove = (password: string) => {
		setInOutbound(true);

		adminSignin(password).then((res) => {
			if (res.isErr()) {
				topRef.current?.setPassword("");
				setInOutbound(false);
				return;
			}

			const token = res.value.token;

			setEncryptionKey(password);
			cookies.set(TokenKey, token, { expires: new Date(res.value.expires) });

			runOutboundAnimation()
				.then(() => {
					router.push("/admin");
				})
				.catch(console.error);
		});
	};

	const submitBelow = (id: string) => {
		if (id.length === 5) {
			setInOutbound(true);

			checkStudent(id).then((res) => {
				if (res.isErr()) {
					setInOutbound(false);
					return;
				}

				if (!res.value) {
					toast.warning(
						"You don't have any hours yet! Check back once you've signed in at least once",
					);
					setInOutbound(false);
					return;
				}

				cookies.set(StudentIdKey, id);

				setInOutbound(true);
				runOutboundAnimation()
					.then(() => {
						router.push("/student");
					})
					.catch(console.error);
			});
		}
	};

	// -- prefetching
	// biome-ignore lint/correctness/useExhaustiveDependencies: router is not a dependency.
	useEffect(() => {
		router.prefetch("/admin");
		router.prefetch("/student");
	}, []);

	if (!canLoad) return <></>;

	return (
		<div className="flex flex-row gap-[3vw] w-full">
			<motion.div
				className="absolute flex justify-center items-center top-[10vh] w-full m-auto"
				animate={headerctl}
			>
				<Label className="text-2xl font-bold">Log In</Label>
			</motion.div>

			<div className="flex flex-col gap-[1.5vh] items-center justify-center w-full">
				<motion.div
					animate={topctl}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					className="flex md:flex-row max-md:flex-col max-md:mb-18 justify-center items-center"
				>
					<LabeledIcon className="md:absolute md:-translate-x-68" label="Admin">
						<UserIcon className="hidden md:flex" />
					</LabeledIcon>

					<InputPassword
						submit={submitAbove}
						onFocus={() => {
							setActive("top");
							bottomRef.current?.setStudentId("");
						}}
						ref={topRef}
						onBlur={() => setActive("none")}
						className="w-14 h-14 max-md:w-12 max-md:h-12"
					/>

					<div className="md:absolute md:translate-x-66 max-md:mt-8">
						<MaybeLoading
							state={active === "top" ? adminToken : undefined}
							width="2rem"
							height="2rem"
						/>
					</div>
				</motion.div>
				<motion.div
					animate={barctl}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					className="max-md:hidden w-82"
				>
					<Separator />
				</motion.div>
				<motion.div
					animate={bottomctl}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					className="flex md:flex-row max-md:flex-col max-md:mt-18 justify-center items-center"
				>
					<LabeledIcon
						className="md:absolute md:-translate-x-68"
						label="Student"
					>
						<GraduationCap className="hidden md:flex" />
					</LabeledIcon>

					<InputStudentId
						submit={submitBelow}
						onFocus={() => {
							setActive("bottom");
							topRef.current?.setPassword("");
						}}
						ref={bottomRef}
						onBlur={() => setActive("none")}
						className="w-14 h-14 max-md:w-12 max-md:h-12"
					/>

					<div className="md:absolute md:translate-x-66 max-md:mt-8">
						<MaybeLoading
							state={active === "bottom" ? studentExists : undefined}
							width="2rem"
							height="2rem"
						/>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
