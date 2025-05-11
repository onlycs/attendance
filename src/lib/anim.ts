import { TargetAndTransition } from 'framer-motion';

export const AnimDefault: TargetAndTransition = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
};

export function defaultExt(defs: TargetAndTransition): TargetAndTransition {
    return { ...AnimDefault, ...defs };
}
