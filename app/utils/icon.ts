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
} as const;
