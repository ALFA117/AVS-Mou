"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { formatBps } from "@/lib/format";

export function BidConfirmModal({
  amount,
  equityBps,
  onCancel,
  onConfirm,
}: {
  amount: string;
  equityBps: number;
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
          <Lock className="h-4 w-4 text-primary" strokeWidth={2} />
          Confirm sealed bid
        </h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="font-mono-avs font-medium text-card-foreground">{amount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Equity offered (round)</dt>
            <dd className="font-mono-avs font-medium text-card-foreground">{formatBps(equityBps)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Your bid is sealed — no one, including the startup, can see this amount until the
          deal reveals after its deadline.
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
            Confirm Bid
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
