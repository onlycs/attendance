"use client";

import type { PasswordOverlayRef } from "@components/forms/password";
import { PasswordOverlay } from "@components/forms/password";
import type { ThreeBtnRef } from "@components/pages/threebtn";
import { ThreeBtn } from "@components/pages/threebtn";
import {
	EncryptionKey,
	TokenKey,
	useRequireStorage,
	useSession,
} from "@lib/storage";
import { ClockIcon, LogOutIcon, Table2Icon } from "lucide-react";
import { useCookies } from "next-client-cookies";
import { useRef } from "react";

export default function Home() {
	const cookies = useCookies();
	const canLoad = useRequireStorage([{ key: TokenKey }]);
	const layout = useRef<ThreeBtnRef>(null);
	const overlay = useRef<PasswordOverlayRef>(null);

	const { delete: deleteEnckey } = useSession(EncryptionKey);

	if (!canLoad) return <></>;

	return (
		<div className="flex flex-col items-center justify-center w-full h-full">
			<PasswordOverlay
				redirect={(to) => {
					layout.current?.outbound(to);
				}}
				ref={overlay}
			/>

			<ThreeBtn
				ref={layout}
				targets={[
					{
						title: "Hours Editor",
						icon: (
							<Table2Icon
								className="max-md:mb-6 size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52"
								strokeWidth={1}
							/>
						),
						link: "/admin/editor",
					},
					{
						title: "Attendance",
						icon: (
							<ClockIcon
								className="max-md:mb-6 size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52"
								strokeWidth={1}
							/>
						),
						link: "/attendance",
					},
					{
						title: "Log Out",
						icon: (
							<LogOutIcon
								className="max-md:mb-6 size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52"
								strokeWidth={1}
								color="red"
							/>
						),
						link: "/",
						onClick() {
							cookies.remove(TokenKey);
							deleteEnckey();
						},
					},
				]}
			/>
		</div>
	);
}
