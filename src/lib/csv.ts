import sha256 from 'sha256';

export function processCsv(user_f: string, api_f: string): string {
	const ulines = user_f.replaceAll('\r', '').split('\n');
	const alines = api_f.split('\n');

	const user = Object.fromEntries(ulines.slice(1).map((line: string) => {
		const data = line.split(',');

		const id = data[0];
		const rest = data.slice(1);

		return [id, rest];
	}));

	const api = Object.fromEntries(alines.slice(1).map((line: string) => {
		const data = line.split(',');

		const id = data[0];
		const rest = data.slice(1);

		return [id, rest];
	}));

	const next = [];

	for (const [id, rest] of Object.entries(user)) {
		const api_id = sha256(id);

		if (api_id in api) {
			next.push([id, ...rest, ...api[api_id]]);
		}
	}

	const header = ['id', ...ulines[0].split(',').slice(1), ...alines[0].split(',').slice(1)];
	const out = [header, ...next.map(line => line.join(','))].join('\n');

	return out;
}