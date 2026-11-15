"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet, CheckCircle2, ChevronDown, RefreshCw } from "lucide-react";
import { useMilestones } from "@/hooks/useMilestones";
import { VoteCard } from "@/components/VoteCard";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { WalletConnectButton } from "@/components/WalletConnectButton";
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
  const { milestones, loading, error, refresh } = useMilestones();
  const reducedMotion = useReducedMotion();
  const { t } = useTranslation();

  // Milestones are public (only each vote is sealed), so anyone can see
  // what's open; a wallet is only needed to actually cast a vote.
  const now = Date.now();
  const unrevealed = milestones.filter((m) => m.status === "open");
  const votable = unrevealed
    .filter((m) => m.deadlineTs * 1000 > now)
    .sort((a, b) => a.deadlineTs - b.deadlineTs);
  const closed = unrevealed
    .filter((m) => m.deadlineTs * 1000 <= now)
    .sort((a, b) => b.deadlineTs - a.deadlineTs);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-normal leading-tight text-foreground sm:text-4xl">{t("votePage.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("votePage.subtitle")}</p>
        </div>
        <button
          onClick={() => void refresh()}
          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 px-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          {t("common.refresh")}
        </button>
      </div>

      {!publicKey && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted p-4">
          <Wallet className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">{t("votePage.connectPrompt")}</p>
          <WalletConnectButton />
        </div>
      )}

      {loading && (
        <div className="mt-6 space-y-4">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {!loading && error && (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          {t("votePage.loadError")}
        </p>
      )}

      {!loading && !error && votable.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title={t("votePage.noMilestonesTitle")}
          description={t("votePage.noMilestones")}
        />
      )}

      {!loading && (
        <motion.div
          variants={reducedMotion ? undefined : container}
          initial={reducedMotion ? undefined : "hidden"}
          animate={reducedMotion ? undefined : "show"}
          className="mt-6 space-y-4"
        >
          {votable.map((m) => (
            <motion.div key={m.publicKey} variants={reducedMotion ? undefined : item}>
              <VoteCard milestone={m} onVoted={() => void refresh()} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && closed.length > 0 && (
        <details className="group mt-8">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" strokeWidth={2} />
            {t("votePage.closedHeading", { count: closed.length })}
          </summary>
          <div className="mt-3 space-y-4">
            {closed.map((m) => (
              <VoteCard key={m.publicKey} milestone={m} />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
