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

export class Draw {
	constructor(
		public readonly ctx: CanvasRenderingContext2D,
		private readonly canvas: HTMLCanvasElement,
	) {
		/*
		 * canvas units aren't the same as pixels for some reason
		 * so we have to do this fun dance to make it look good
		 */
		const dpr = window.devicePixelRatio || 1;
		const rect = this.canvas.getBoundingClientRect();
		this.canvas.width = rect.width * dpr;
		this.canvas.height = rect.height * dpr;
		this.ctx.scale(dpr, dpr);

		// set some defaults
		this.ctx.textBaseline = "top";
		this.ctx.lineWidth = 1;
		this.ctx.lineJoin = "round";
		this.ctx.lineCap = "round";
	}

	measureText(text: string, fontsize = 1): TextMetrics {
		this.ctx.font = `${fontsize}rem 'JetBrains Mono', monospace`;
		return this.ctx.measureText(text);
	}

	text(
		text: string,
		x: number,
		y: number,
		fontsize = 1,
		color = Colors.text,
	): void {
		this.ctx.beginPath();
		this.ctx.fillStyle = color;
		this.ctx.font = `${fontsize}rem 'JetBrains Mono', monospace`;
		this.ctx.fillText(text, x, y);
		this.ctx.closePath();
	}

	textHeight(fontsize = 1) {
		this.ctx.textBaseline = "alphabetic";
		const height = this.measureText("Mg", fontsize).actualBoundingBoxAscent;
		this.ctx.textBaseline = "top";
		return height;
	}

	rect(
		x: number,
		y: number,
		w: number,
		h: number,
		fill: string,
		stroke: string,
	): void {
		this.ctx.fillStyle = fill;
		this.ctx.strokeStyle = stroke;

		this.ctx.fillRect(x, y, w, h);
		this.ctx.strokeRect(x, y, w, h);
	}

	roundRect(
		x: number,
		y: number,
		w: number,
		h: number,
		fill: string,
		stroke: string,
	): void {
		this.ctx.beginPath();

		this.ctx.fillStyle = fill;
		this.ctx.strokeStyle = stroke;

		this.ctx.roundRect(x, y, w, h, 4);
		this.ctx.stroke();
		this.ctx.fill();

		this.ctx.closePath();
	}

	dot(x: number, y: number, radius: number, color: string): void {
		this.ctx.beginPath();
		this.ctx.fillStyle = color;
		this.ctx.arc(x, y, radius, 0, Math.PI * 2);
		this.ctx.fill();
		this.ctx.closePath();
	}

	icon(x: number, y: number, w: number, h: number, url: string): void {
		const img = new Image();
		img.addEventListener("load", () => {
			this.ctx.drawImage(img, x, y, w, h);
		});
		img.width = w;
		img.height = h;
		img.src = url;
	}

	clear(): void {
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	}
}
