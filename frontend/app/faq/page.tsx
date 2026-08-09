"use client";

import { HelpCircle } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export default function FaqPage() {
  const { t } = useTranslation();

  const FAQS = [1, 2, 3, 4, 5, 6].map((n) => ({
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`),
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-heading text-2xl font-light tracking-tight text-foreground">{t("faq.title")}</h1>
      <div className="mt-6 space-y-6">
        {FAQS.map((item) => (
          <div key={item.q} className="avs-elevate rounded-xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 font-medium text-card-foreground">
              <HelpCircle className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
              {item.q}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
