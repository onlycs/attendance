import * as React from "react";

import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, ...props }, ref) => {
		const radius = 100;
		const [visible, setVisible] = React.useState(false);
		const mouseX = useMotionValue(0);
		const mouseY = useMotionValue(0);

		function onMouse({
			currentTarget,
			clientX,
			clientY,
		}: React.MouseEvent<HTMLInputElement>) {
			const { left, top } = currentTarget.getBoundingClientRect();
			mouseX.set(clientX - left);
			mouseY.set(clientY - top);
		}

		return (
			<motion.div
				onMouseMove={onMouse}
				onMouseEnter={() => setVisible(true)}
				onMouseLeave={() => setVisible(false)}
				style={{
					background: useMotionTemplate`
                    radial-gradient(
                        ${visible ? `${radius}px` : "0px"} circle at ${mouseX}px ${mouseY}px,
                        #ffffff,
                        transparent 80%
                    )
                    `,
				}}
				className="group/input rounded-lg p-[1px] transition duration-3000"
			>
				<input
					type={type}
					className={cn(
						"flex h-10 w-full rounded-md border border-border transition-all bg-background px-3 py-2 text-sm placeholder:text-sub focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50",
						className,
					)}
					autoComplete="off"
					ref={ref}
					{...props}
				/>
			</motion.div>
		);
	},
);
Input.displayName = "Input";

export { Input };
