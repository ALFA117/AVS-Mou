"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CircleAlert, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <div className="avs-icon-badge mx-auto h-14 w-14">
          <CircleAlert className="h-7 w-7 text-primary" strokeWidth={2} />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-light tracking-tight text-foreground">
          {t("errorPage.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errorPage.subtitle")}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="avs-glow-primary mt-7 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          {t("errorPage.retry")}
        </button>
      </motion.div>
    </main>
  );
}
