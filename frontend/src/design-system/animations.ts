export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } }
} as any;

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
} as any;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0 }
} as any;

export const slideInRight = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } },
  exit: { opacity: 0, x: 100, transition: { duration: 0.2 } }
} as any;

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } }
} as any;

export const itemFadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
} as any;
