"use client";

import { motion } from "framer-motion";
import { Vote as VoteIcon } from "lucide-react";
import type { Choice } from "@/lib/types";

export function VoteConfirmModal({
  choice,
  onCancel,
  onConfirm,
}: {
  choice: Choice;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg"
      >
        <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-card-foreground">
          <VoteIcon className="h-4 w-4 text-primary" strokeWidth={2} />
          Confirm your vote
        </h3>
        <p className="mt-3 text-sm text-card-foreground">
          You&apos;re voting <span className="font-semibold uppercase">{choice}</span>.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Your vote is sealed — no one, including the startup, can see how you voted until
          reveal.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Confirm Vote
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
