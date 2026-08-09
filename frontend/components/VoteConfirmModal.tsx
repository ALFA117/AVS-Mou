"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Vote as VoteIcon } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";
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
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-confirm-title"
        className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-6 shadow-lg"
      >
        <h3
          id="vote-confirm-title"
          className="flex items-center gap-2 font-heading text-lg font-light tracking-tight text-card-foreground"
        >
          <VoteIcon className="h-4 w-4 text-primary" strokeWidth={2} />
          {t("voteConfirmModal.title")}
        </h3>
        <p className="mt-3 text-sm text-card-foreground">
          {t("voteConfirmModal.votingOn", { choice: choice.toUpperCase() })}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{t("voteConfirmModal.notice")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <motion.button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted"
          >
            {t("common.cancel")}
          </motion.button>
          <motion.button
            type="button"
            onClick={onConfirm}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="cursor-pointer avs-glow-primary rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90"
          >
            {t("voteConfirmModal.confirm")}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
