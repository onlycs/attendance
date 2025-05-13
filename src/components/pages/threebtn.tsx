import { FocusCards } from '@ui/focus-cards';
import { useAnimationControls } from 'framer-motion';
import { useRouter } from 'next/navigation';
import React, { ReactNode, useEffect, useImperativeHandle } from 'react';

export interface Target {
    title: string;
    icon: ReactNode;
    onClick?: () => void;
    link?: string;
}

const CardAnim = {
    variants: {
        above: { y: '-90vh', scale: 0.5, opacity: 0 },
        center: { y: 0, scale: 1, opacity: 1 },
        below: { y: '90vh', scale: 0.5, opacity: 0 },
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

export interface ThreeBtnProps {
    targets: Target[];
}

export interface ThreeBtnRef {
    outbound: (url: string) => void;
}

export const ThreeBtn = React.forwardRef<ThreeBtnRef, ThreeBtnProps>(({ targets }, ref) => {
    const router = useRouter();

    const fwdController = useAnimationControls();
    const bwdController = useAnimationControls();

    useEffect(() => {
        targets
            .filter(target => target.link)
            .forEach(target => router.prefetch(target.link!));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fwdController.start('center').catch(console.error);
        bwdController.start('center').catch(console.error);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        outbound: (url: string) => {
            fwdController.set('center');
            bwdController.set('center');

            fwdController.start('below').catch(console.error);
            bwdController.start('above').catch(console.error);

            setTimeout(() => {
                fwdController.set('below');
                bwdController.set('above');

                router.push(url);
            }, CardAnim.transition.duration * 1000);
        },
    }));

    const outbound = (url: string) => {
        fwdController.set('center');
        bwdController.set('center');
        fwdController.start('below').catch(console.error);
        bwdController.start('above').catch(console.error);
        setTimeout(() => {
            router.push(url);
        }, CardAnim.transition.duration * 1000);
    };

    const fwdAnim = {
        ...CardAnim,
        animate: fwdController,
    };

    const bwdAnim = {
        ...CardAnimInv,
        animate: bwdController,
    };

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
});

ThreeBtn.displayName = 'ThreeBtn';

// export function ThreeBtn({ targets, triggerRedirect: forceRedirect }: ThreeBtnProps) {
//     const router = useRouter();

//     const fwdController = useAnimationControls();
//     const bwdController = useAnimationControls();

//     useEffect(() => {
//         targets
//             .filter(target => target.link)
//             .forEach(target => router.prefetch(target.link!));
//     }, []); // eslint-disable-line react-hooks/exhaustive-deps

//     useEffect(() => {
//         if (forceRedirect) {
//             outbound(forceRedirect);
//         }
//     }, [forceRedirect]); // eslint-disable-line react-hooks/exhaustive-deps

//     const fwdAnim = {
//         ...CardAnim,
//         animate: fwdController,
//     };

//     const bwdAnim = {
//         ...CardAnimInv,
//         animate: bwdController,
//     };

//     const outbound = (url: string) => {
//         fwdController.set('center');
//         bwdController.set('center');

//         fwdController.start('below').catch(console.error);
//         bwdController.start('above').catch(console.error);

//         setTimeout(() => {
//             router.push(url);
//         }, CardAnim.transition.duration * 1000);
//     };

//     useEffect(() => {
//         fwdController.start('center').catch(console.error);
//         bwdController.start('center').catch(console.error);
//     }, []); // eslint-disable-line react-hooks/exhaustive-deps

//     return (
//         <FocusCards
//             cards={
//                 targets.map((target, index) => {
//                     return {
//                         ...target,
//                         motion: index == 1 ? bwdAnim : fwdAnim,
//                         onClick: () => {
//                             target.onClick?.();
//                             if (target.link) {
//                                 outbound(target.link);
//                             }
//                         },
//                     };
//                 })
//             }
//         />
//     );
// }
