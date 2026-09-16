// Motion presets for framer-motion animations

export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition = {
  type: 'tween' as const,
  ease: 'easeOut',
  duration: 0.2,
};

export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -3, scale: 1.01 },
  tap: { scale: 0.98 },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};
