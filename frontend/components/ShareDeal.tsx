"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export function ShareDeal({ dealTitle, url }: { dealTitle: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  const shareText = t("shareDeal.tweetText", { dealTitle });
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-4 text-sm">
      <a
        href={tweetUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
      >
        <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
        {t("shareDeal.shareOnX")}
      </a>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex cursor-pointer items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" strokeWidth={2} />
            {t("shareDeal.copied")}
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
            {t("shareDeal.copyLink")}
          </>
        )}
      </button>
    </div>
  );
}
