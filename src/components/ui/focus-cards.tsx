'use client';

import React, { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { HTMLMotionProps, motion } from 'framer-motion';

export const Card = React.memo(
    ({
        card,
        index,
        hovered,
        setHovered,
    }: {
        card: Card;
        index: number;
        hovered: number | null;
        setHovered: (index: number | null) => void;
    }) => (
        <motion.div
            onMouseEnter={() => { setHovered(index); }}
            onMouseLeave={() => { setHovered(null); }}
            className={cn(
                'rounded-lg relative bg-gray-100 dark:bg-neutral-900 overflow-hidden transition-all duration-300 ease-out cursor-pointer',
                'size-48 md:size-52 lg:size-56 xl:size-68 2xl:size-84',
                hovered !== null && hovered !== index && 'blur-sm scale-[0.98]',
            )}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            onClick={card.onClick}
            {...card.motion}
        >
            <div className='flex justify-center items-center w-full h-full'>
                {card.icon}
            </div>
            <div
                className={cn(
                    'absolute inset-0 md:bg-black/50 flex items-end py-4 px-5 transition-opacity duration-300',
                    hovered === index ? 'opacity-100' : 'md:opacity-0',
                )}
            >
                <div className='text-lg md:text-xl xl:text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-200'>
                    {card.title}
                </div>
            </div>
        </motion.div>
    ),
);

Card.displayName = 'Card';

interface Card {
    title: string;
    icon: ReactNode;
    motion: HTMLMotionProps<'div'>;
    onClick: () => void;
}

export function FocusCards({ cards }: { cards: Card[] }) {
    const [hovered, setHovered] = useState<number | null>(null);

    return (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 lg:gap-22 xl:gap-32 2xl:gap-42'>
            {cards.map((card, index) => (
                <Card
                    key={card.title}
                    card={card}
                    index={index}
                    hovered={hovered}
                    setHovered={setHovered}
                />
            ))}
        </div>
    );
}
