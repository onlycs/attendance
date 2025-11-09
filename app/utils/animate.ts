import { CustomEase } from "gsap/all";

export type GSAPTimingParams = {
    duration: number;
    ease: Parameters<(typeof gsap)["to"]>[2]["ease"];
};

export interface SingleTiming {
    in: GSAPTimingParams;
    out: GSAPTimingParams;
    offset: number;
}

export const Timing = {
    in: {
        ease: "circ.out",
        duration: 0.3,
    },
    out: {
        ease: "circ.out",
        duration: 0.2,
    },
    offset: 0.1,
    fast: {
        in: {
            ease: "circ.out",
            duration: 0.15,
        },
        out: {
            ease: "circ.out",
            duration: 0.1,
        },
        offset: 0.05,
    },
    slow: {
        in: {
            ease: "circ.out",
            duration: 0.4,
        },
        out: {
            ease: "circ.out",
            duration: 0.3,
        },
        offset: 0.15,
    },
    smooth: {
        in: {
            ease: CustomEase.create(
                "custom",
                "M0,0 C0.173,0 0.216,0.003 0.322,0.064 0.428,0.125 0.457,0.367 0.502,0.506 0.539,0.624 0.62,0.824 0.726,0.916 0.799,0.98 0.869,1 1,1 ",
            ),
            duration: 0.75,
        },
        out: {
            ease: CustomEase.create(
                "custom",
                "M0,0 C0.173,0 0.216,0.003 0.322,0.064 0.428,0.125 0.457,0.367 0.502,0.506 0.539,0.624 0.62,0.824 0.726,0.916 0.799,0.98 0.869,1 1,1 ",
            ),
            duration: 0.6,
        },
        offset: 0.2,
    },
} as SingleTiming & {
    fast: SingleTiming;
    slow: SingleTiming;
    smooth: SingleTiming;
};

export const PreTranslateOffset = 20; // in rem
