"use client";

import { ThreeBtn } from "@components/pages/threebtn";
import { StudentIdKey, useRequireStorage } from "@lib/storage";
import { CalendarClock, HourglassIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCookies } from "next-client-cookies";
import { useEffect } from "react";

export default function Student() {
	const router = useRouter();
	const cookies = useCookies();
	const canLoad = useRequireStorage([{ key: StudentIdKey }]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: router is not a dependency
	useEffect(() => {
		router.prefetch("/student/hours");
		router.prefetch("/student/request");
		router.prefetch("/");
	}, []);

	if (!canLoad) return <></>;

	return (
		<ThreeBtn
			targets={[
				{
					title: "Check Hours",
					icon: (
						<HourglassIcon
							className="max-md:mb-6 size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52"
							strokeWidth={1}
						/>
					),
					link: "/student/hours",
				},
				{
					title: "Change Request",
					icon: (
						<CalendarClock
							className="max-md:mb-6 size-24 md:size-28 lg:size-34 xl:size-42 2xl:size-52"
							strokeWidth={1}
						/>
					),
					link: "/student/request",
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
					onClick: () => cookies.remove(StudentIdKey),
					link: "/",
				},
			]}
		/>
	);
}
