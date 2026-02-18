/**
 * SuccessCelebration — the joyful moment after a work request is submitted.
 *
 * Sequence timeline:
 *  0 ms   – Card entrance + background glow
 *  300 ms – Green circle scales in
 *  550 ms – Checkmark draws itself
 *  700 ms – Heading fades up
 *  880 ms – Work Order # fades up
 * 1060 ms – Confirmation message fades up
 * 1240 ms – Email note fades up
 * 1420 ms – Gratitude line fades up
 * 1600 ms – Confetti burst fires 🎉
 * 1780 ms – Buttons appear
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  successCardEntrance,
  checkmarkCircle,
  checkmarkPath,
  textSequence,
  buttonHover,
} from "@/lib/animations/variants";
import { useConfetti, usePrefersReducedMotion } from "@/lib/animations/hooks";
import type { ConfettiParticle } from "@/lib/animations/hooks";

// ─────────────────────────────────────────────────────────────
// Confetti layer – rendered outside the card, fixed to viewport
// ─────────────────────────────────────────────────────────────

const ConfettiLayer = ({ particles }: { particles: ConfettiParticle[] }) => (
  <AnimatePresence>
    {particles.map((p) => (
      <motion.span
        key={p.id}
        initial={{ scale: 0, x: 0, y: 0, opacity: 1, rotate: 0 }}
        animate={{
          scale: [0, 1, 0.6, 0],
          x: p.x,
          y: p.y,
          opacity: [0, 1, 0.8, 0],
          rotate: p.rotate,
        }}
        transition={{ duration: 2, ease: "easeOut", delay: p.delay }}
        style={{
          position: "fixed",
          // Anchor to the checkmark area (roughly centred)
          left: "50%",
          top: "38%",
          width: p.shape === "circle" ? p.size : p.size * 1.4,
          height: p.shape === "circle" ? p.size : p.size * 0.55,
          borderRadius: p.shape === "circle" ? "50%" : "2px",
          backgroundColor: p.color,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />
    ))}
  </AnimatePresence>
);

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface SuccessCelebrationProps {
  workOrderId: string;
  requestorEmail?: string;
  onViewStatus: () => void;
  onSubmitAnother: () => void;
}

export const SuccessCelebration = ({
  workOrderId,
  requestorEmail,
  onViewStatus,
  onSubmitAnother,
}: SuccessCelebrationProps) => {
  const { triggerConfetti, particles } = useConfetti();
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;
    const t = setTimeout(triggerConfetti, 1600);
    return () => clearTimeout(t);
  }, [prefersReduced, triggerConfetti]);

  // In reduced-motion mode use instant transitions everywhere
  const motionProps = prefersReduced
    ? { initial: false as const, animate: "animate" as const }
    : { initial: "initial" as const, animate: "animate" as const };

  return (
    <>
      {/* Confetti particles rendered at viewport level */}
      {!prefersReduced && <ConfettiLayer particles={particles} />}

      {/* Full-screen layout */}
      <motion.div
        className="min-h-[calc(100vh-73px)] flex items-center justify-center p-4 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: prefersReduced ? 0 : 0.3 }}
      >
        {/* Radial background glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.6, delay: 0.1 }}
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 40%, #EFF6FF 0%, #FAFBFC 100%)",
          }}
        />

        {/* Success card */}
        <motion.div
          variants={successCardEntrance}
          {...motionProps}
          className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          {/* Top accent gradient bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#10B981]" />

          <div className="p-8 md:p-10 text-center flex flex-col items-center">
            {/* ── Animated checkmark ── */}
            <div className="mb-6 relative">
              {/* Outer glow ring */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.25, 1], opacity: [0, 0.3, 0] }}
                transition={{ duration: prefersReduced ? 0 : 0.8, delay: 0.25 }}
                className="absolute inset-0 rounded-full bg-green-400"
                style={{ margin: "-8px" }}
              />

              {/* Green circle */}
              <motion.div
                variants={checkmarkCircle}
                {...motionProps}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
              >
                {/* SVG checkmark */}
                <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                  <motion.path
                    d="M14 32 L27 45 L50 20"
                    stroke="#10B981"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={checkmarkPath}
                    {...motionProps}
                  />
                </svg>
              </motion.div>
            </div>

            {/* ── Text sequence ── */}
            <motion.h2
              custom={0}
              variants={textSequence}
              {...motionProps}
              className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2"
            >
              Request Submitted!
            </motion.h2>

            <motion.div
              custom={1}
              variants={textSequence}
              {...motionProps}
              className="mb-5"
            >
              <div className="inline-block px-5 py-3 bg-green-50 rounded-xl border border-green-100">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">
                  Your Work Order ID
                </p>
                <p className="text-2xl font-extrabold text-green-700 font-mono tracking-wide">
                  {workOrderId}
                </p>
              </div>
            </motion.div>

            <motion.p
              custom={2}
              variants={textSequence}
              {...motionProps}
              className="text-gray-600 text-sm leading-relaxed mb-2"
            >
              Our facilities team will review your request shortly.
              Save your work order ID above to track status anytime.
            </motion.p>

            {requestorEmail && (
              <motion.p
                custom={3}
                variants={textSequence}
                {...motionProps}
                className="text-gray-400 text-xs mb-1"
              >
                A copy will be sent to{" "}
                <span className="font-semibold text-gray-500">
                  {requestorEmail}
                </span>
              </motion.p>
            )}

            <motion.p
              custom={4}
              variants={textSequence}
              {...motionProps}
              className="text-primary text-xs font-semibold mb-8"
            >
              Thank you for keeping Harborside beautiful ✦
            </motion.p>

            {/* ── Buttons ── */}
            <motion.div
              custom={5}
              variants={textSequence}
              {...motionProps}
              className="flex gap-3 w-full"
            >
              <motion.button
                variants={buttonHover}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={onViewStatus}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  search
                </span>
                View Status
              </motion.button>

              <motion.button
                variants={buttonHover}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={onSubmitAnother}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-blue-500/25"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Submit Another
              </motion.button>
            </motion.div>
          </div>

          {/* Bottom confetti hint strip (tiny dots, decorative) */}
          <div className="h-1 w-full flex overflow-hidden">
            {["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#06B6D4"].map(
              (c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              )
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};
