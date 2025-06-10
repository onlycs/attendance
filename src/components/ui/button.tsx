import { cn } from "@lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLMotionProps, motion } from "framer-motion";
import * as React from "react";

const ButtonVariants = cva("relative p-2 rounded-md text-sm", {
	variants: {
		variant: {
			default: "bg-card",
			primary: "bg-gray-100 text-black",
			error: "error bg-background text-text",
		},
		animation: {
			default: "",
			static: "",
		},
	},
});

export interface ButtonProps
	extends Omit<HTMLMotionProps<"button">, "ref">,
		VariantProps<typeof ButtonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			children,
			variant = "default",
			animation = "default",
			...props
		},
		ref,
	) => {
		const nonStaticHover = {
			y: "-0.35rem",
			scale: 1.025,
		};

		const nonStaticTap = {
			scale: 0.975,
		};

		const whileHover = animation === "static" ? {} : nonStaticHover;

		const whileTap = animation === "static" ? {} : nonStaticTap;

		return (
			<motion.button
				ref={ref}
				className={cn(ButtonVariants({ variant, animation }), className)}
				whileHover={whileHover}
				whileTap={whileTap}
				transition={{
					duration: 0.15,
					ease: "easeInOut",
				}}
				{...props}
			>
				<div className="absolute inset-0 rounded-md transition-all hover:bg-hover hover:active:bg-select" />

				{children as React.ReactNode}
			</motion.button>
		);
	},
);
Button.displayName = "Button";

export { Button };
