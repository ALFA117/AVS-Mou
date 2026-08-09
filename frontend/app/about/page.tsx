"use client";

import Link from "next/link";
import { ShieldCheck, Workflow, Cpu, Link2 } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-heading text-2xl font-bold text-foreground">{t("about.title")}</h1>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={2} />
          {t("about.privacyTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("about.privacyText")}</p>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Workflow className="h-4 w-4 text-primary" strokeWidth={2} />
          {t("about.howTitle")}
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t("about.howStep1")}</li>
          <li>{t("about.howStep2")}</li>
          <li>{t("about.howStep3")}</li>
          <li>{t("about.howStep4")}</li>
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Cpu className="h-4 w-4 text-primary" strokeWidth={2} />
          {t("about.techTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("about.techTextPrefix")}{" "}
          <a href="https://magicblock.gg" className="text-primary underline" target="_blank" rel="noreferrer">
            MagicBlock
          </a>{" "}
          {t("about.techTextSuffix")}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Link2 className="h-4 w-4 text-primary" strokeWidth={2} />
          {t("about.linksTitle")}
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link href="/faq" className="text-primary underline">{t("about.linksFaq")}</Link>
          </li>
          <li>
            <Link href="/legal" className="text-primary underline">{t("about.linksLegal")}</Link>
          </li>
          <li>
            <a
              href="https://github.com/ALFA117/AVS-Mou"
              className="text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              {t("about.linksGithub")}
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
