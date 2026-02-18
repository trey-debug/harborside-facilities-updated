/**
 * Framer Motion animation variants for Harborside Facilities app.
 * Public-facing side only: landing page, work request form, success screen.
 *
 * Design philosophy: joyful, welcoming, purpose-driven – every animation
 * enhances UX rather than decorating for its own sake.
 */

import { Variants } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// ACCESSIBILITY UTILITY
// ─────────────────────────────────────────────────────────────

/** True when the OS/browser requests reduced motion. */
export const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Returns the given config unchanged in normal mode,
 * or an instant (duration: 0) override in reduced-motion mode.
 */
export const getAnimationConfig = <T extends object>(config: T): T =>
  prefersReducedMotion ? ({ duration: 0 } as unknown as T) : config;

// ─────────────────────────────────────────────────────────────
// PAGE-LEVEL
// ─────────────────────────────────────────────────────────────

/** Smooth route transition – fade + slight upward rise. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

/** Hero section entrance – gentle scale-in + fade. */
export const heroFadeIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut", delay: 0.1 },
  },
};

/** Stagger parent – orchestrates staggered children. */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

/** Individual stagger child – slides up while fading in. */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// ─────────────────────────────────────────────────────────────
// CARD ANIMATIONS
// ─────────────────────────────────────────────────────────────

/** Hover + tap states for interactive cards. */
export const cardHover: Variants = {
  rest: { y: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  hover: {
    y: -4,
    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
    transition: { duration: 0.2, type: "spring", stiffness: 400, damping: 25 },
  },
  tap: { scale: 0.98 },
};

/** Cards entering the view – scale up from slightly below. */
export const cardAppear: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

/** Continuous subtle pulse for urgent/attention items. */
export const pulseGlow: Variants = {
  animate: {
    scale: [1, 1.02, 1],
    opacity: [1, 0.9, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

// ─────────────────────────────────────────────────────────────
// FORM STEP TRANSITIONS
// ─────────────────────────────────────────────────────────────

/**
 * Direction-aware step variants.
 * Pass `custom="forward"` or `custom="backward"` to AnimatePresence
 * and each motion.div.
 */
export const stepVariants: Variants = {
  initial: (dir: "forward" | "backward") => ({
    opacity: 0,
    x: dir === "forward" ? 50 : -50,
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: "easeOut" },
  },
  exit: (dir: "forward" | "backward") => ({
    opacity: 0,
    x: dir === "forward" ? -50 : 50,
    transition: { duration: 0.28, ease: "easeIn" },
  }),
};

/** Progress bar fill – scaleX from left to right. */
export const progressIndicatorFill: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: {
    scaleX: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/** SVG checkmark path draw animation. */
export const checkmarkDraw: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// ─────────────────────────────────────────────────────────────
// INPUT FIELD ANIMATIONS
// ─────────────────────────────────────────────────────────────

/** Success icon appearing next to a valid input. */
export const inputSuccess: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: [0, 1.2, 1],
    opacity: 1,
    transition: { duration: 0.3, type: "spring" },
  },
};

/** Shake animation for invalid/error inputs. */
export const inputError: Variants = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
};

// ─────────────────────────────────────────────────────────────
// PRIORITY CARD SELECTION
// ─────────────────────────────────────────────────────────────

/** Priority card when first selected – satisfying bounce. */
export const priorityCardSelected: Variants = {
  animate: {
    scale: [0.96, 1.03, 1],
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

/** Click ripple – expanding + fading circle from tap point. */
export const rippleEffect: Variants = {
  initial: { scale: 0, opacity: 0.5 },
  animate: {
    scale: 2.5,
    opacity: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

/** Icon bounce on priority card selection. */
export const priorityIconBounce: Variants = {
  animate: {
    scale: [1, 1.25, 0.9, 1.05, 1],
    rotate: [0, 6, -4, 2, 0],
    transition: { duration: 0.5 },
  },
};

// ─────────────────────────────────────────────────────────────
// FILE UPLOAD
// ─────────────────────────────────────────────────────────────

/** Drop zone state when a file hovers over it. */
export const dragOverState: Variants = {
  rest: { scale: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  dragOver: {
    scale: 1.02,
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
    transition: { duration: 0.2 },
  },
};

/** Individual file chip entering the list. */
export const fileChipSlideIn: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.9 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: { duration: 0.2 },
  },
};

// ─────────────────────────────────────────────────────────────
// SUCCESS CELEBRATION
// ─────────────────────────────────────────────────────────────

/** Success card appearing after form submission. */
export const successCardEntrance: Variants = {
  initial: { opacity: 0, scale: 0.82, y: 30 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut", delay: 0.1 },
  },
};

/** Green circle scaling in. */
export const checkmarkCircle: Variants = {
  initial: { scale: 0 },
  animate: {
    scale: [0, 1.12, 1],
    transition: { duration: 0.4, ease: "easeOut", delay: 0.3 },
  },
};

/** SVG checkmark path draw – delays after the circle appears. */
export const checkmarkPath: Variants = {
  initial: { pathLength: 0 },
  animate: {
    pathLength: 1,
    transition: { duration: 0.6, ease: "easeOut", delay: 0.55 },
  },
};

/**
 * Sequenced text reveal for success screen items.
 * Use `custom={index}` on each element: 0, 1, 2 …
 */
export const textSequence: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      delay: 0.7 + i * 0.18,
    },
  }),
};

// ─────────────────────────────────────────────────────────────
// BUTTON ANIMATIONS
// ─────────────────────────────────────────────────────────────

/** Standard button hover + tap state. */
export const buttonHover: Variants = {
  rest: { y: 0 },
  hover: {
    y: -2,
    boxShadow: "0 8px 20px rgba(59,130,246,0.35)",
    transition: { duration: 0.15 },
  },
  tap: { scale: 0.97 },
};

/** CTA submit button – continuous glow pulse in idle state. */
export const submitButtonPulse: Variants = {
  idle: {
    boxShadow: [
      "0 4px 15px rgba(59,130,246,0.30)",
      "0 8px 28px rgba(59,130,246,0.52)",
      "0 4px 15px rgba(59,130,246,0.30)",
    ],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  loading: {
    boxShadow: "0 2px 8px rgba(59,130,246,0.20)",
  },
};

// ─────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────

/** Floating icon in empty state – gentle levitation loop. */
export const emptyStateIcon: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

/** Empty state container – staggers child elements in. */
export const emptyStateFade: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.15 },
  },
};

/** Child item inside emptyStateFade. */
export const emptyStateFadeItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};
