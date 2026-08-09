"use client";

import { useEffect, useRef, useState } from "react";
import { Download, CircleCheck, Trash2, KeyRound } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSessionKey } from "@/hooks/useSessionKey";
import { usePortfolio } from "@/hooks/usePortfolio";
import { SEALED_AUCTION_PROGRAM_ID, PRIVATE_VOTING_PROGRAM_ID } from "@/lib/programs";
import { downloadCsv, positionsToCsv } from "@/lib/csv";
import { useTranslation } from "@/lib/LanguageContext";

const NOTIF_STORAGE_KEY = "avs.settings.notifications";

function loadNotifPref(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(NOTIF_STORAGE_KEY) !== "off";
}

export default function SettingsPage() {
  const { publicKey } = useWallet();
  const { positions } = usePortfolio();
  const bidSession = useSessionKey(SEALED_AUCTION_PROGRAM_ID);
  const voteSession = useSessionKey(PRIVATE_VOTING_PROGRAM_ID);
  const [notifEnabled, setNotifEnabled] = useState(loadNotifPref);
  const [cleared, setCleared] = useState(false);
  const { t } = useTranslation();

  if (!publicKey) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-heading text-2xl font-light tracking-tight text-foreground">{t("settings.title")}</h1>
        <p className="mt-6 text-sm text-muted-foreground">{t("settings.connectPrompt")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-heading text-2xl font-light tracking-tight text-foreground">{t("settings.title")}</h1>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-light tracking-tight text-foreground">
          <KeyRound className="h-4 w-4 text-primary" strokeWidth={2} />
          {t("settings.sessionKeysTitle")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("settings.sessionKeysSeeFaq")} <a href="/faq" className="text-primary underline">{t("settings.faqLinkLabel")}</a>{" "}
          {t("settings.sessionKeysHint")}
        </p>
        <div className="mt-3 space-y-2">
          <SessionRow programName={t("settings.biddingProgram")} session={bidSession} />
          <SessionRow programName={t("settings.votingProgram")} session={voteSession} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-light tracking-tight text-foreground">{t("settings.notifications")}</h2>
        <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={notifEnabled}
            onChange={(e) => {
              setNotifEnabled(e.target.checked);
              window.localStorage.setItem(NOTIF_STORAGE_KEY, e.target.checked ? "on" : "off");
            }}
            className="h-4 w-4 accent-primary"
          />
          {t("settings.notifyLabel")}
        </label>
        <p className="mt-1 text-xs text-muted-foreground">{t("settings.notifyHint")}</p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-light tracking-tight text-foreground">{t("settings.exportData")}</h2>
        <button
          type="button"
          disabled={positions.length === 0}
          onClick={() => downloadCsv("avs-portfolio.csv", positionsToCsv(positions))}
          className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={2} />
          {t("settings.exportPortfolio")}
        </button>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-light tracking-tight text-foreground">{t("settings.privacy")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("settings.privacyText")}{" "}
          <a href="/legal" className="text-primary underline">{t("settings.legalLinkLabel")}</a>{" "}
          {t("settings.privacyTextSuffix")}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(t("settings.clearConfirm"))) {
              return;
            }
            bidSession.revoke();
            voteSession.revoke();
            for (const key of Object.keys(window.localStorage)) {
              if (key.startsWith("avs.chat.") || key.startsWith("avs.sessionKey.")) {
                window.localStorage.removeItem(key);
              }
            }
            setCleared(true);
          }}
          className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          {t("settings.clearData")}
        </button>
        {cleared && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
            <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} />
            {t("settings.cleared")}
          </p>
        )}
      </section>
    </main>
  );
}

function SessionRow({
  programName,
  session,
}: {
  programName: string;
  session: ReturnType<typeof useSessionKey>;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  function handleRevokeClick() {
    if (!confirming) {
      setConfirming(true);
      // Revoking invalidates the session key immediately — re-authorizing
      // costs the user a fresh wallet signature — so a single misclick
      // shouldn't trigger it. A short-lived "click again to confirm" avoids
      // the heavier friction of a full modal for what's still a reversible,
      // low-stakes action.
      resetTimer.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setConfirming(false);
    session.revoke();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground">
      <span>{programName}</span>
      {session.state.status === "active" ? (
        <span className="flex items-center gap-2">
          <span className="font-mono-avs text-green-700 dark:text-green-400">
            {t("settings.activeUntil", { time: session.state.expiresAt.toLocaleTimeString() })}
          </span>
          <button
            onClick={handleRevokeClick}
            className={
              confirming
                ? "cursor-pointer rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-red-700"
                : "cursor-pointer text-red-600 underline dark:text-red-400"
            }
          >
            {confirming ? t("settings.revokeConfirm") : t("settings.revoke")}
          </button>
        </span>
      ) : session.state.status === "authorizing" ? (
        <span className="text-muted-foreground">{t("settings.waitingSignature")}</span>
      ) : (
        <span className="flex items-center gap-2">
          {session.state.status === "error" && (
            <span role="alert" className="text-xs text-red-600 dark:text-red-400">{session.state.message}</span>
          )}
          <button
            onClick={() => session.authorize()}
            className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90"
          >
            {t("settings.authorize")}
          </button>
        </span>
      )}
    </div>
  );
}
