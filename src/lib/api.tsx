import Link from 'next/link';
import { API_URL } from './utils';

interface AuthenticatedRequest {
	token: string;
}

export interface HoursRequest {
	id: string;
}

export interface LoginRequest {
	password: string;
}

export interface RosterRequest extends AuthenticatedRequest {
	id: string;
}

export interface HoursResponse {
	hours: number;
}

export interface LoginResponse {
	token: string;
}

export interface RosterResponse {
	login: boolean;
}

export interface CSVResponse {
	csv: string;
}

export interface Error {
	ecode: number;
	message: string;
}

export interface Requests {
	'/hours': HoursRequest;
	'/login': LoginRequest;
	'/roster': RosterRequest;
	'/hours.csv': AuthenticatedRequest;
}

export interface Responses {
	'/hours': HoursResponse;
	'/login': LoginResponse;
	'/roster': RosterResponse;
	'/hours.csv': CSVResponse;
}

export interface HttpResult<T> {
	ok: boolean;
	result?: T;
	error?: Error;
}


type OptionalBearer = { 'Authorization': string } | Record<string, never>;
type OptionalBody = { body: string } | Record<string, never>;
type Route = keyof Requests & keyof Responses;

const RequestMethod: Record<Route, 'GET' | 'POST'> = {
	'/hours': 'GET',
	'/login': 'POST',
	'/roster': 'POST',
	'/hours.csv': 'GET'
};

export const Errors = {
	[500]: <>Problem with the server. Get Angad to fix this</>,
	[401]: <>Incorrect password or token. Try <Link href="/login">logging in again.</Link></>,
	[404]: <>Not found</>,
} as Record<number, JSX.Element>;

export function FetchError(fn: (_: string) => void): () => void {
	return () => fn('Could not connect to the server. Are you online? Ask Angad for help');
}

export function GetError(ecode: number, def: string = 'Unknown error'): JSX.Element {
	return Errors[ecode] || <>{def}</>;
}

export function makeurl<T extends Route>(route: T, data: Requests[T]): string {
	const url = new URL(`${API_URL}${route}`);

	if (RequestMethod[route] === 'GET') {
		Object.entries(data).forEach(([key, value]) => {
			url.searchParams.append(key, value.toString());
		});

		url.searchParams.append('json', 'true');
	}

	return url.toString();
}

export function makebody<T extends Route>(route: T, data: Requests[T]): OptionalBody {
	if (RequestMethod[route] === 'GET') {
		return {};
	}

	return { body: JSON.stringify(data) };
}

export function tfetch<T extends Route>(route: T, data: Requests[T]): Promise<HttpResult<Responses[T]>> {
	const bearer: OptionalBearer =
		'token' in data && RequestMethod[route] === 'POST'
			? { 'Authorization': `Bearer ${data.token}` }
			: {};

	return new Promise((resolve, reject) => {
		fetch(makeurl(route, data), {
			method: RequestMethod[route],
			headers: {
				'Content-Type': 'application/json',
				...bearer
			},
			...makebody(route, data)
		})
			.then(async res => {
				if (res.ok) {
					resolve({
						ok: true,
						result: await res.json()
					});
				} else {
					resolve({
						ok: false,
						error: {
							ecode: res.status,
							message: await res.text()
						}
					});
				}
			})
			.catch(reject);
	});
}