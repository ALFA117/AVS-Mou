"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMilestones } from "@/hooks/useMilestones";
import { VoteCard } from "@/components/VoteCard";
import { SkeletonRow } from "@/components/Skeleton";
import { useTranslation } from "@/lib/LanguageContext";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } },
};

export default function VotePage() {
  const { publicKey } = useWallet();
  const { milestones, loading, refresh } = useMilestones();
  const open = milestones.filter((m) => m.status === "open");
  const reducedMotion = useReducedMotion();
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{t("votePage.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("votePage.subtitle")}</p>
        </div>
      </div>

      {!publicKey && (
        <p className="mt-10 text-center text-muted-foreground">{t("votePage.connectPrompt")}</p>
      )}

      {publicKey && loading && (
        <div className="mt-6 space-y-4">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {publicKey && !loading && open.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">{t("votePage.noMilestones")}</p>
      )}

      {publicKey && (
        <motion.div
          variants={reducedMotion ? undefined : container}
          initial={reducedMotion ? undefined : "hidden"}
          animate={reducedMotion ? undefined : "show"}
          className="mt-6 space-y-4"
        >
          {open.map((m) => (
            <motion.div key={m.publicKey} variants={reducedMotion ? undefined : item}>
              <VoteCard milestone={m} onVoted={() => void refresh()} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  );
}
