"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center"
    >
      <motion.div
        initial={reduceMotion ? undefined : { scale: 0.7, opacity: 0 }}
        animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: reduceMotion ? 0 : 0.08 }}
        className="avs-icon-badge h-12 w-12"
      >
        <Icon className="h-6 w-6 text-primary" strokeWidth={2} />
      </motion.div>
      <h2 className="mt-4 font-heading text-lg font-light text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
