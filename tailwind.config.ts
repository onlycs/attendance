import type { Config } from "tailwindcss";
import theme from "tailwindcss/defaultTheme";

const config: Config = {
    darkMode: "class",
    content: ["./src/**/*.vue", "./src/**/*.ts"],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        transitionTimingFunction: {
            DEFAULT: "var(--tw-ease)",
            "in-out": "ease-in-out",
        },
        extend: {
            colors: {
                drop: "var(--drop)",
                background: "var(--background)",
                card: "var(--card)",
                "card-2": "var(--card-2)",
                text: "var(--text)",
                hover: "var(--hover)",
                border: "var(--border)",
                sub: "var(--text-sub)",
            },
            borderRadius: {
                xl: "calc(var(--radius) + 4px)",
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            screens: {
                "max-h-md": { "raw": "(max-height: 647px)" },
                "h-md": { "raw": "(min-height: 648px)" },
                "h-lg": { "raw": "(min-height: 1024px)" },
            },
        },
    },
};
export default config;
