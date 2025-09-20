export const Colors = {
	drop: "#171717",
	backgroundDark: "#1f1f1f",
	background: "#242424",
	card: "#303030",
	cardHover: "#3d3d3d",
	cardActive: "#282828",
	card2: "#565656",
	card2Hover: "#636363",
	card2Active: "#494949",
	text: "#d7d7d7",
	textSub: "#8c8c8c",
};

export const FontSize = {
	normal: 1,
	lg: 1.125,
};

export class Accumulate {
	private total: number;
	private last: number;

	constructor(initial: number = 0) {
		this.total = initial;
		this.last = initial;
	}

	add(value: number = 1): void {
		this.last = this.total;
		this.total += value;
	}

	set(value: number = 0): void {
		this.total = value;
		this.last = value;
	}

	get value(): number {
		return this.total;
	}

	get prev(): number {
		return this.last;
	}
}

// Sourced from hugeicons:arrow-down
export const ChevronSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#8c8c8c" fill="none">
    <path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9" stroke="#8c8c8c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

const Chevron = new Lazy(() => {
	const icon = new Image();
	icon.src = `data:image/svg+xml;base64,${btoa(ChevronSVG)}`;
	return icon;
});

// i don't know how i thought of this
export class VirtualCanvas {
	private commands: Array<
		(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void
	> = [];

	private readonly measureCanvas = document.createElement("canvas");
	private readonly measureCtx = this.measureCanvas.getContext("2d")!;

	private cachedCanvas: HTMLCanvasElement | null = null;
	private cachedBitmap: ImageBitmap | null = null;

	private maxWidth = 0;
	private maxHeight = 0;

	private wasChanged = true;

	private ensure(x: number, y: number, w: number, h: number): void {
		const needWidth = x + w;
		const needHeight = y + h;

		this.maxWidth = Math.max(this.maxWidth, needWidth);
		this.maxHeight = Math.max(this.maxHeight, needHeight);

		this.wasChanged = true;

		Chevron.load();
	}

	setFont(): void {
		this.measureCtx.font = `${FontSize.normal}rem 'JetBrains Mono', monospace`;
	}

	textSize(text: string, size = FontSize.normal): TextMetrics {
		this.measureCtx.font = `${size}rem 'JetBrains Mono', monospace`;
		return this.measureCtx.measureText(text);
	}

	textHeight(size = FontSize.normal): number {
		this.measureCtx.textBaseline = "alphabetic";
		const height = this.textSize("M", size).actualBoundingBoxAscent;
		this.measureCtx.textBaseline = "top";
		return height;
	}

	text(
		text: string,
		x: number,
		y: number,
		options: Partial<{ size: number; color: string }> = {},
	): { width: number; height: number } {
		const size = options.size ?? FontSize.normal;
		const color = options.color ?? Colors.text;

		const width = this.textSize(text, size).width;
		const height = Convert.remToPx(size); // .measureTextHeight is for centering

		this.commands.push((_, ctx) => {
			ctx.beginPath();

			ctx.fillStyle = color;
			ctx.font = `${size}rem 'JetBrains Mono', monospace`;
			ctx.fillText(text, x, y);

			ctx.closePath();
		});

		this.ensure(x, y, width, height);
		return { width, height };
	}

	rect(
		x: Accumulate | number,
		y: Accumulate | number,
		w: number,
		h: number,
		fill: string,
		stroke: string,
	): void {
		const rectX = x instanceof Accumulate ? x.value : x;
		const rectY = y instanceof Accumulate ? y.value : y;

		this.commands.push((_, ctx) => {
			ctx.beginPath();

			ctx.fillStyle = fill;
			ctx.strokeStyle = stroke;

			ctx.rect(rectX, rectY, w, h);
			ctx.fill();
			ctx.stroke();

			ctx.closePath();
		});

		this.ensure(rectX, rectY, w, h);

		if (x instanceof Accumulate) x.add(w);
		if (y instanceof Accumulate) y.add(h);
	}

	roundRect(
		x: Accumulate | number,
		y: Accumulate | number,
		w: number,
		h: number,
		fill: string,
		stroke: string,
		radius = 4,
	): void {
		const rectX = x instanceof Accumulate ? x.value : x;
		const rectY = y instanceof Accumulate ? y.value : y;

		this.commands.push((_, ctx) => {
			ctx.beginPath();

			ctx.fillStyle = fill;
			ctx.strokeStyle = stroke;

			ctx.roundRect(rectX, rectY, w, h, radius);
			ctx.stroke();
			ctx.fill();

			ctx.closePath();
		});

		this.ensure(rectX, rectY, w, h);

		if (x instanceof Accumulate) x.add(w);
		if (y instanceof Accumulate) y.add(h);
	}

	chevron(x: number, y: number, w: number, h: number): void {
		this.commands.push((_, ctx) => {
			ctx.drawImage(Chevron.value, x, y, w, h);
		});

		this.ensure(x, y, w, h);
	}

	clear(): void {
		this.commands = [];
		this.maxWidth = 0;
		this.maxHeight = 0;
		this.wasChanged = true;
	}

	build(): HTMLCanvasElement {
		if (this.cachedCanvas && !this.wasChanged) return this.cachedCanvas;
		this.wasChanged = false;

		// create canvas
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d")!;

		// make canvas size correct
		const dpr = window.devicePixelRatio || 1;
		canvas.width = this.maxWidth * dpr;
		canvas.height = this.maxHeight * dpr;
		canvas.style.width = `${this.maxWidth}px`;
		canvas.style.height = `${this.maxHeight}px`;
		ctx.scale(dpr, dpr);

		// set some defaults
		ctx.textBaseline = "top";
		ctx.lineWidth = 1;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		for (const command of this.commands) {
			command(canvas, ctx);
		}

		// cache it
		this.cachedCanvas = canvas;

		// firefox performance optimization
		createImageBitmap(canvas).then((bitmap) => {
			this.cachedBitmap = bitmap;
		});

		return canvas;
	}

	paste(
		other: CanvasRenderingContext2D,
		x: Accumulate | number,
		y: Accumulate | number,
	): void;
	paste(
		other: CanvasRenderingContext2D,
		x: Accumulate | number,
		y: Accumulate | number,
		srcX: number,
		srcY: number,
	): void;
	paste(
		other: CanvasRenderingContext2D,
		x: Accumulate | number,
		y: Accumulate | number,
		srcX: number,
		srcY: number,
		width: number,
		height: number,
	): void;
	paste(
		other: CanvasRenderingContext2D,
		x: Accumulate | number,
		y: Accumulate | number,
		srcX?: number,
		srcY?: number,
		width?: number,
		height?: number,
	): void {
		width ??= this.width;
		height ??= this.height;
		srcX ??= 0;
		srcY ??= 0;

		const dpr = window.devicePixelRatio || 1;
		const canvas = this.build();

		const destX = x instanceof Accumulate ? x.value : x;
		const destY = y instanceof Accumulate ? y.value : y;

		if (this.cachedBitmap) {
			other.drawImage(
				this.cachedBitmap,
				Math.round(srcX), // firefox hates decimals here, apparently.
				Math.round(srcY),
				Math.round(width * dpr),
				Math.round(height * dpr),
				Math.round(destX),
				Math.round(destY),
				Math.round(width),
				Math.round(height),
			);
		} else {
			other.drawImage(
				canvas,
				Math.round(srcX),
				Math.round(srcY),
				Math.round(width * dpr),
				Math.round(height * dpr),
				Math.round(destX),
				Math.round(destY),
				Math.round(width),
				Math.round(height),
			);
		}

		if (x instanceof Accumulate) x.add(width);
		if (y instanceof Accumulate) y.add(height);
	}

	get width(): number {
		return this.maxWidth;
	}

	get height(): number {
		return this.maxHeight;
	}
}
