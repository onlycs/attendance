import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'w-full h-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                filled: 'hover:bg-hover',
            },
            size: {
                default: 'h-10 px-4 py-2',
                wide: 'h-10 w-96 px-6 py-2',
                xwide: 'h-10 w-[28rem] px-8 py-2',
            },
        },
        defaultVariants: {
            variant: 'filled',
            size: 'default',
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <div className={cn('rounded-md bg-card text-text', className)}>
                <Comp
                    className={cn(buttonVariants({ variant, size }))}
                    ref={ref}
                    {...props}
                />
            </div>
        );
    },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
