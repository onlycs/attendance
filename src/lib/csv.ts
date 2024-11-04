import sha256 from 'sha256';

export interface UserInput {
	id: string;
	first: string;
	last: string;
}

export interface UserOutput extends UserInput {
	hours: number;
}

export interface ApiInput {
	[id: string]: number;
}

interface CsvHeader {
	// title: index
	[key: string]: number;
}

function parseHeader(firstline: string): CsvHeader {
	const header = Object.fromEntries(firstline.trim().split(',').map((title, index) => [title, index]));
	return header;
}

function parseUserRecords(header: CsvHeader, lines: string[]): UserInput[] {
	if (!('id' in header && 'first' in header && 'last' in header)) {
		throw new Error('Invalid CSV header');
	}

	return lines.map(line => {
		const fields = line.split(',');

		return {
			id: fields[header.id],
			first: fields[header.first],
			last: fields[header.last],
		};
	});
}

function parseApiRecords(header: CsvHeader, lines: string[]): ApiInput {
	if (!('id' in header && 'hours' in header)) {
		throw new Error('Invalid CSV header');
	}

	return Object.fromEntries(lines.map(line => {
		const fields = line.split(',');

		return [fields[header.id], parseInt(fields[header.hours])];
	}));
}

function parseUser(file: string): UserInput[] {
	const lines = file.split('\n');
	const header = parseHeader(lines[0]);
	const records = parseUserRecords(header, lines.splice(1));

	return records;
}

function parseApi(file: string): ApiInput {
	const lines = file.split('\n');
	const header = parseHeader(lines[0]);
	const records = parseApiRecords(header, lines.splice(1));
	return records;
}

function merge(records: UserInput[], hours: ApiInput): UserOutput[] {
	return records.map(record => ({
		...record,
		hours: hours[sha256(record.id)] ?? 0,
	}));
}

function tocsv(records: UserOutput[]): string {
	const header = 'id,first,last,hours\n';
	const body = records.map(record => `${record.id},${record.first},${record.last},${record.hours}`).join('\n');
	return header + body;
}

export function processCsv(file: string, hours: string): string {
	const records = parseUser(file.replaceAll('\r', ''));
	const api = parseApi(hours);
	const merged = merge(records, api);
	return tocsv(merged);
}