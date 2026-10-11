"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Next.js remounts template.tsx (unlike layout.tsx) on every route change,
 * which is what drives a fresh enter animation per page. Direct
 * history.replaceState calls (e.g. the /deals filter-sync) aren't Next.js
 * router navigations, so they don't retrigger this — only real route
 * changes do.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      // Solo desplazamiento, sin opacity 0: el HTML del servidor se ve aunque
      // el JS tarde o falle; la entrada sigue notándose en cada navegación.
      initial={reduceMotion ? false : { y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
