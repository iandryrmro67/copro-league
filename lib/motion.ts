import type { Variants } from "motion/react";
export const eases = {
  enter: [0.22, 1, 0.36, 1],
  exit: [0.64, 0, 0.78, 0],
} as const;
export const durations = {
  micro: 0.22,
  page: 0.6,
  badge: 0.35,
  reduced: 0.15,
  ring: 0.5,
} as const;
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.reduced } },
  exit: { opacity: 0, transition: { duration: durations.reduced } },
};
export const slide: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: eases.enter },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: { duration: 0.22, ease: eases.exit },
  },
};
