"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <div className="avs-icon-badge mx-auto h-14 w-14">
          <Compass className="h-7 w-7 text-primary" strokeWidth={2} />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-light tracking-tight text-foreground">
          {t("notFound.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.subtitle")}</p>
        <Link
          href="/"
          className="avs-glow-primary mt-7 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep"
        >
          {t("notFound.backHome")}
        </Link>
      </motion.div>
    </main>
  );
}
