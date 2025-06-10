import { useEffect, useState } from "react";

export interface MdMatch<T> {
	sm: T;
	md: T;
}

export function useMd<T>({ sm, md }: MdMatch<T>) {
	const [data, setData] = useState<T>(md);

	// biome-ignore lint/correctness/useExhaustiveDependencies: neither sm nor md should change
	useEffect(() => {
		const query = window.matchMedia("(min-width: 768px)");
		const update = () => setData(query.matches ? md : sm);
		update();

		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);

	return data;
}
