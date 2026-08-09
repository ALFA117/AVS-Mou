"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

/** A thin, permanent reminder that every number on this app is test data —
 * added after real numbers ($410K+ "capital deployed", 31 deals) started
 * showing up and reading like a real, funded product at a glance. */
export function DevnetBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-1.5 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
      <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={2} />
      {t("devnetBanner.text")}
    </div>
  );
}
