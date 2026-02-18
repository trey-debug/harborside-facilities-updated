/**
 * Reusable animated building blocks for Harborside Facilities.
 * Import from "@/lib/animations" (see index.ts barrel).
 */

import React, { useState, useRef, Children } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { cardAppear, staggerItem } from "./variants";

// ─────────────────────────────────────────────────────────────
// AnimatedCard
// ─────────────────────────────────────────────────────────────

interface AnimatedCardProps {
  children: React.ReactNode;
  /** Extra entrance delay in seconds */
  delay?: number;
  /** Enable hover lift + shadow */
  hover?: boolean;
  className?: string;
}

/**
 * Drop-in replacement for plain `<div>` wrappers that should appear
 * with a slide-up fade and optionally respond to hover/tap.
 *
 * @example
 * <AnimatedCard delay={0.1} hover>
 *   <CardContent />
 * </AnimatedCard>
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  hover = false,
  className = "",
}) => (
  <motion.div
    variants={cardAppear}
    initial="initial"
    animate="animate"
    transition={{ delay }}
    whileHover={
      hover
        ? { y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.11)", transition: { duration: 0.2, type: "spring", stiffness: 380, damping: 22 } }
        : undefined
    }
    whileTap={hover ? { scale: 0.98 } : undefined}
    className={className}
  >
    {children}
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// StaggeredList
// ─────────────────────────────────────────────────────────────

interface StaggeredListProps {
  children: React.ReactNode;
  /** Seconds between each child's animation start */
  staggerDelay?: number;
  className?: string;
}

/**
 * Wraps children in a stagger container so each one fades/slides in
 * sequentially.  Children do NOT need to be motion elements.
 *
 * @example
 * <StaggeredList staggerDelay={0.1} className="space-y-4">
 *   {requests.map(r => <RequestCard key={r.id} ... />)}
 * </StaggeredList>
 */
export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 0.08,
  className = "",
}) => (
  <motion.div
    initial="initial"
    animate="animate"
    variants={{
      animate: { transition: { staggerChildren: staggerDelay } },
    }}
    className={className}
  >
    {Children.map(children, (child, i) => (
      <motion.div key={i} variants={staggerItem}>
        {child}
      </motion.div>
    ))}
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// FloatingElement
// ─────────────────────────────────────────────────────────────

interface FloatingElementProps {
  children: React.ReactNode;
  /** Vertical movement distance in px (default 10) */
  amplitude?: number;
  /** Full cycle duration in seconds (default 3) */
  duration?: number;
}

/**
 * Wraps content in a gentle, continuous floating animation.
 * Great for illustrations, icons, and empty-state art.
 */
export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  amplitude = 10,
  duration = 3,
}) => (
  <motion.div
    animate={{ y: [0, -amplitude, 0] }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// PulseGlow
// ─────────────────────────────────────────────────────────────

interface PulseGlowProps {
  children: React.ReactNode;
  color?: string;
  /** Shadow spread intensity 0–1 (default 0.3) */
  intensity?: number;
}

/**
 * Adds a soft, repeating glow/shadow pulse around children.
 * Use on urgent status badges or notification indicators.
 */
export const PulseGlow: React.FC<PulseGlowProps> = ({
  children,
  color = "#3B82F6",
  intensity = 0.3,
}) => {
  const alpha = Math.round(intensity * 255)
    .toString(16)
    .padStart(2, "0");

  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 0 0 ${color}00`,
          `0 0 0 8px ${color}${alpha}`,
          `0 0 0 0 ${color}00`,
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      style={{ borderRadius: "inherit", display: "inline-flex" }}
    >
      {children}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// SlideInView
// ─────────────────────────────────────────────────────────────

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
}

/**
 * Animates children into view once they scroll into the viewport.
 * Animation fires only once (not on scroll-out).
 *
 * @example
 * <SlideInView direction="up" delay={0.1}>
 *   <Section />
 * </SlideInView>
 */
export const SlideInView: React.FC<SlideInViewProps> = ({
  children,
  direction = "up",
  delay = 0,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const offsets: Record<string, { x: number; y: number }> = {
    up:    { y: 30,  x: 0  },
    down:  { y: -30, x: 0  },
    left:  { y: 0,   x: 30 },
    right: { y: 0,   x: -30 },
  };

  const { x, y } = offsets[direction];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x, y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// RippleButton
// ─────────────────────────────────────────────────────────────

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RippleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** CSS color string for the ripple circle */
  rippleColor?: string;
}

/**
 * A `<button>` that spawns an expanding circle ripple from the exact
 * click point.  Accepts all standard button attributes.
 *
 * @example
 * <RippleButton
 *   className="px-6 py-3 bg-primary text-white rounded-lg"
 *   rippleColor="rgba(255,255,255,0.35)"
 *   onClick={handleSubmit}
 * >
 *   Submit
 * </RippleButton>
 */
export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  rippleColor = "rgba(255,255,255,0.38)",
  onClick,
  className = "",
  ...props
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [
      ...prev,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 720);
    onClick?.(e);
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            style={{
              position: "absolute",
              borderRadius: "50%",
              width: 60,
              height: 60,
              left: ripple.x - 30,
              top: ripple.y - 30,
              backgroundColor: rippleColor,
              pointerEvents: "none",
            }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// AnimatedCheckmark
// ─────────────────────────────────────────────────────────────

interface AnimatedCheckmarkProps {
  /** Diameter of the circle in px (default 64) */
  size?: number;
  /** Stroke + fill color (default green) */
  color?: string;
  /** Seconds before the animation begins */
  delay?: number;
}

/**
 * An SVG checkmark with:
 * 1. Circular background that scales in
 * 2. Checkmark path that draws itself
 *
 * Useful in step completions and the success celebration screen.
 *
 * @example
 * <AnimatedCheckmark size={80} color="#10B981" delay={0.2} />
 */
export const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  size = 64,
  color = "#10B981",
  delay = 0,
}) => (
  <div style={{ width: size, height: size, position: "relative" }}>
    {/* Background circle */}
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.12, 1] }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        backgroundColor: `${color}22`,
      }}
    />
    {/* SVG path */}
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ position: "absolute", inset: 0 }}
    >
      <motion.path
        d="M14 32 L27 45 L50 20"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: delay + 0.25 }}
      />
    </svg>
  </div>
);
