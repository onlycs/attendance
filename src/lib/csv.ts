import sha256 from 'sha256';

export interface UserInput {
	id: string;
	first: string;
	last: string;
}

export interface ApiInput {
	id: string;
	hours: number;
}

export interface UserOutput extends UserInput {
	hours: number;
}

export interface UserInputKeyed {
	[id: string]: UserInput;
}

interface CsvHeader {
	// title: index
	[key: string]: number;
}

function parseHeader(firstline: string): CsvHeader {
	const header = Object.fromEntries(firstline.split(',').map((title, index) => [title, index]));
	return header;
}

function parseUserRecords(header: CsvHeader, lines: string[]): UserInput[] {
	return lines.map(line => {
		const fields = line.split(',');

		return {
			id: fields[header.id],
			first: fields[header.first],
			last: fields[header.last],
		};
	});
}

function parseApiRecords(header: CsvHeader, lines: string[]): ApiInput[] {
	return lines.map(line => {
		const fields = line.split(',');

		return {
			id: fields[header.id],
			hours: parseInt(fields[header.hours]),
		};
	});
}

function parseUser(file: string): UserInput[] {
	const lines = file.split('\n');
	const header = parseHeader(lines[0]);
	const records = parseUserRecords(header, lines.splice(1));
	return records;
}

function parseApi(file: string): ApiInput[] {
	const lines = file.split('\n');
	const header = parseHeader(lines[0]);
	const records = parseApiRecords(header, lines.splice(1));
	return records;
}

function merge(records: UserInput[], hours: ApiInput[]): UserOutput[] {
	return records.map(record => {
		const out = {
			...record,
			hours: 0,
		};

		const match = hours.find(hour => hour.id == sha256(record.id));
		if (!match) return undefined;

		return {
			...out,
			hours: match.hours,
		};
	}).filter(record => !!record);
}

function tocsv(records: UserOutput[]): string {
	const header = 'id,first,last,hours\n';
	const body = records.map(record => `${record.id},${record.first},${record.last},${record.hours}`).join('\n');
	return header + body;
}

export function processCsv(file: string, hours: string): string {
	const records = parseUser(file);
	const api = parseApi(hours);
	const merged = merge(records, api);
	return tocsv(merged);
}