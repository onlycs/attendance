export class Profiler {
	start: number;
	name: string;

	constructor(name: string) {
		this.name = name;
		this.start = performance.now();
	}

	stop() {
		const end = performance.now();
		console.log(`${this.name} took ${end - this.start}ms`);
	}
}
