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
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
