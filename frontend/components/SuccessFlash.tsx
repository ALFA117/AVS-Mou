"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * A brief accent-color flash across the parent surface when `trigger` turns
 * true — e.g. a transaction status flipping to "success". Reinforces the
 * checkmark+text confirmation with a moment of feedback across the whole
 * panel instead of just a small icon fading in. The parent needs
 * `relative overflow-hidden` in its className for this to clip correctly.
 */
export function SuccessFlash({ trigger }: { trigger: boolean }) {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger || reduceMotion) return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), 700);
    return () => clearTimeout(timer);
  }, [trigger, reduceMotion]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-none absolute inset-0 bg-green-500/10"
        />
      )}
    </AnimatePresence>
  );
}
