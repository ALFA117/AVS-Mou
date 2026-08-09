"use client";

import { useEffect, useState } from "react";
import { useSpring, useMotionValueEvent, useReducedMotion } from "framer-motion";

/**
 * Springs a numeric value from its previous display to the new one instead
 * of popping straight to the final text — used for headline stat figures
 * (deal counts, capital deployed, leaderboard totals). `format` should be a
 * referentially stable function (a module-level formatter, not an inline
 * arrow) since it's a spring-tick dependency.
 */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 90, damping: 20, mass: 1 });
  const [display, setDisplay] = useState(() => format(reduceMotion ? value : 0));

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(format(value));
      return;
    }
    spring.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  useMotionValueEvent(spring, "change", (latest) => {
    if (!reduceMotion) setDisplay(format(latest));
  });

  return <span>{display}</span>;
}
