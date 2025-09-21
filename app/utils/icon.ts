export const Customize = {
	StrokeWidth(width: number, old?: (content: string) => string) {
		return (content: string) => {
			content = old?.(content) ?? content;
			return content.replace(
				/stroke-width="[^"]*"/g,
				`stroke-width="${width}"`,
			);
		};
	},
	Duplicate(old?: (content: string) => string) {
		return (content: string) => {
			content = old?.(content) ?? content;
			const space = content.indexOf(" ");
			return `${content}${content.slice(0, space)} style="display: none" ${content.slice(space)}`;
		};
	},
} as const;

export const ChevronLeft = `M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18`;
export const ChevronUp = `M17.9998 15C17.9998 15 13.5809 9.00001 11.9998 9C10.4187 8.99999 5.99985 15 5.99985 15`;
