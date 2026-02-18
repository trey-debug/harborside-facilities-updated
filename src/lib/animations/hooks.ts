/**
 * Custom animation hooks for Harborside Facilities.
 * Encapsulates complex stateful animation logic.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useAnimation, useInView } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// usePrefersReducedMotion
// ─────────────────────────────────────────────────────────────

/**
 * Reactively tracks the OS/browser prefers-reduced-motion media query.
 * Returns true when the user has requested less motion.
 */
export const usePrefersReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
};

// ─────────────────────────────────────────────────────────────
// useStaggerReveal
// ─────────────────────────────────────────────────────────────

/**
 * Returns Framer Motion animation controls to imperatively trigger
 * a staggered reveal.  Pass `custom={index}` to each child element.
 *
 * @example
 * const { controls, trigger } = useStaggerReveal(items.length);
 * useEffect(() => { trigger(); }, []);
 * items.map((item, i) => (
 *   <motion.div key={i} custom={i} animate={controls}
 *     initial={{ opacity: 0, y: 15 }}
 *     variants={{ visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1 } }) }}
 *   />
 * ))
 */
export const useStaggerReveal = (itemCount: number, delay = 0.1) => {
  const controls = useAnimation();

  const trigger = useCallback(async () => {
    await controls.start((i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut", delay: i * delay },
    }));
  }, [controls, delay, itemCount]); // eslint-disable-line

  return { controls, trigger };
};

// ─────────────────────────────────────────────────────────────
// useScrollTrigger
// ─────────────────────────────────────────────────────────────

/**
 * Returns a [ref, isInView] tuple.  The animation fires once when
 * the attached element scrolls past the given threshold.
 *
 * @example
 * const [ref, isInView] = useScrollTrigger(0.2);
 * <motion.div ref={ref} animate={isInView ? "visible" : "hidden"} />
 */
export const useScrollTrigger = (threshold = 0.1) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: threshold });
  return [ref, isInView] as const;
};

// ─────────────────────────────────────────────────────────────
// useConfetti
// ─────────────────────────────────────────────────────────────

export interface ConfettiParticle {
  id: number;
  /** Final x offset from origin (px) */
  x: number;
  /** Final y offset from origin (px, positive = down) */
  y: number;
  rotate: number;
  color: string;
  delay: number;
  /** Diameter / short edge in px */
  size: number;
  shape: "circle" | "rect";
}

const CONFETTI_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#06B6D4"];

const isMobile = () =>
  typeof window !== "undefined" && window.innerWidth < 768;

/**
 * Confetti burst hook.
 *
 * @example
 * const { triggerConfetti, particles } = useConfetti();
 * useEffect(() => { setTimeout(triggerConfetti, 1600); }, []);
 * // Render particles in SuccessCelebration
 */
export const useConfetti = () => {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  const triggerConfetti = useCallback(() => {
    const count = isMobile() ? 10 : 20;

    const newParticles: ConfettiParticle[] = Array.from({ length: count }, (_, i) => {
      // Launch arc: 30°–150° (upward hemisphere, randomised left/right)
      const angleDeg = 30 + Math.random() * 120;
      const angleRad = (angleDeg * Math.PI) / 180;
      const speed = 80 + Math.random() * 140;
      const dir = Math.random() > 0.5 ? 1 : -1;

      return {
        id: i,
        x: Math.cos(angleRad) * speed * dir,
        // Negative = up on screen; gravity adds a parabolic feel via easing
        y: -(Math.sin(angleRad) * speed) + Math.random() * 60,
        rotate: Math.random() * 360,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.4,
        size: 7 + Math.random() * 8,
        shape: Math.random() > 0.5 ? "circle" : "rect",
      };
    });

    setParticles(newParticles);
    // Clean up after animation completes
    setTimeout(() => setParticles([]), 2600);
  }, []);

  return { triggerConfetti, particles };
};

// ─────────────────────────────────────────────────────────────
// useFormStepTransition
// ─────────────────────────────────────────────────────────────

/**
 * Tracks the current multi-step form step and derives the slide direction.
 * Returns the direction and a setter to call *before* updating currentStep.
 *
 * @example
 * const { direction, setDirection } = useFormStepTransition();
 * const handleNext = () => { setDirection("forward"); setStep(s => s + 1); };
 * const handleBack = () => { setDirection("backward"); setStep(s => s - 1); };
 *
 * <AnimatePresence mode="wait" custom={direction}>
 *   <motion.div key={currentStep} custom={direction} variants={stepVariants} … />
 * </AnimatePresence>
 */
export const useFormStepTransition = () => {
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  return { direction, setDirection };
};

// ─────────────────────────────────────────────────────────────
// useSequencedReveal
// ─────────────────────────────────────────────────────────────

/**
 * Returns an array of delay values for sequential element reveals.
 * Pass each delay to the corresponding element's transition.
 *
 * @example
 * const delays = useSequencedReveal(["title", "body", "button"], 0.2);
 * <motion.h1 transition={{ delay: delays[0] }} … />
 * <motion.p  transition={{ delay: delays[1] }} … />
 */
export const useSequencedReveal = (items: string[], baseDelay = 0) =>
  items.map((_, i) => baseDelay + i * 0.2);
