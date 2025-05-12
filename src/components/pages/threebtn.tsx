import { FocusCards } from '@ui/focus-cards';
import { useAnimationControls } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export interface Target {
    title: string;
    icon: ReactNode;
    onClick?: () => void;
    link?: string;
}

const CardAnim = {
    variants: {
        above: { y: '-60vh', scale: 0.5, opacity: 0 },
        center: { y: 0, scale: 1, opacity: 1 },
        below: { y: '60vh', scale: 0.5, opacity: 0 },
        hover: { scale: 1.05, y: -10, transition: { duration: 0.1 } },
    },

    initial: 'above',
    whileInView: 'center',
    whileHover: 'hover',
    transition: { duration: 0.25, ease: 'easeInOut' },
};

const CardAnimInv = {
    ...CardAnim,
    initial: 'below',
};

export function ThreeBtn({ targets }: { targets: Target[] }) {
    const router = useRouter();

    const fwdController = useAnimationControls();
    const bwdController = useAnimationControls();

    useEffect(() => {
        targets
            .filter(target => target.link)
            .forEach(target => router.prefetch(target.link!));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fwdAnim = {
        ...CardAnim,
        animate: fwdController,
    };

    const bwdAnim = {
        ...CardAnimInv,
        animate: bwdController,
    };

    const outbound = (url: string) => {
        fwdController.set('center');
        bwdController.set('center');

        fwdController.start('below').catch(console.error);
        bwdController.start('above').catch(console.error);

        setTimeout(() => {
            router.push(url);
        }, CardAnim.transition.duration * 1000);
    };

    useEffect(() => {
        fwdController.start('center').catch(console.error);
        bwdController.start('center').catch(console.error);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <FocusCards
            cards={
                targets.map((target, index) => {
                    return {
                        ...target,
                        motion: index == 1 ? bwdAnim : fwdAnim,
                        onClick: () => {
                            target.onClick?.();
                            if (target.link) {
                                outbound(target.link);
                            }
                        },
                    };
                })
            }
        />
    );
}
