"use client";

import { CircleAlert, FileText, Lock } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export default function LegalPage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-heading text-2xl font-bold text-foreground">{t("legal.title")}</h1>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <span className="avs-icon-badge h-7 w-7"><CircleAlert className="h-3.5 w-3.5 text-primary" strokeWidth={2} /></span>
          {t("legal.disclaimerTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("legal.disclaimerText")}</p>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <span className="avs-icon-badge h-7 w-7"><FileText className="h-3.5 w-3.5 text-primary" strokeWidth={2} /></span>
          {t("legal.tosTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("legal.tosText")}</p>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <span className="avs-icon-badge h-7 w-7"><Lock className="h-3.5 w-3.5 text-primary" strokeWidth={2} /></span>
          {t("legal.privacyTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("legal.privacyText")}</p>
      </section>
    </main>
  );
}
