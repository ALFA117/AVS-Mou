"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Lock, Vote, Zap, Dices, ArrowRight, Plus, Eye, EyeOff } from "lucide-react";
import { StatsBand } from "@/components/StatsBand";
import { useTranslation } from "@/lib/LanguageContext";

/**
 * The hero's own visual: a term sheet with its bid ledger. Your line is
 * readable; everyone else's is a solid redaction bar. It only illustrates
 * the mechanic — sample data, labelled as such, never a real bid.
 */
function TermSheet() {
  const { t } = useTranslation();
  const others = [
    { id: "7Hq2…kP9w", width: "w-24" },
    { id: "Cx41…e2Ra", width: "w-16" },
    { id: "9mZt…Q8vn", width: "w-20" },
  ];

  return (
    <figure
      className="avs-rise relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_0_var(--shadow-ambient),0_12px_32px_-16px_var(--shadow-ambient-strong)]"
      style={{ animationDelay: "160ms" }}
      aria-label={t("home.sheetFootnote")}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <span className="avs-eyebrow">{t("home.sheetHeading")}</span>
        <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono-avs text-[11px] uppercase tracking-wider text-muted-foreground">
          {t("home.sheetTag")}
        </span>
      </div>

      <div className="px-5 pb-5 pt-4">
        <p className="font-display text-2xl text-card-foreground">{t("home.sheetRound")}</p>

        <dl className="mt-4 grid grid-cols-3 border-y border-border">
          {[
            [t("dealCard.equityOffered"), "8.00%"],
            [t("dealCard.minInvestment"), "500"],
            [t("dealCard.closesIn"), "2d 6h"],
          ].map(([label, value], i) => (
            <div key={label} className={`py-3 ${i > 0 ? "border-l border-border pl-3" : "pr-3"}`}>
              <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-mono-avs text-base text-card-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="avs-eyebrow mt-5">{t("home.feature1Title")}</p>
        <ul className="mt-2 divide-y divide-border">
          <li className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-card-foreground">
                <Eye className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
                {t("home.sealedLabel")}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{t("home.sheetVisibleTo")}</p>
            </div>
            <span className="shrink-0 font-mono-avs text-base text-card-foreground">1,200.00</span>
          </li>
          {others.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm text-card-foreground">
                  <EyeOff className="h-3.5 w-3.5 shrink-0 text-brass" strokeWidth={2} aria-hidden="true" />
                  {t("home.sheetBidder")} <span className="font-mono-avs text-muted-foreground">{o.id}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{t("home.sheetHiddenTo")}</p>
              </div>
              <span className={`avs-redact h-5 ${o.width} shrink-0`} aria-label="•••••" />
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-start gap-2 rounded-md bg-brass-subdued px-3 py-2.5 text-sm text-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brass" strokeWidth={2} aria-hidden="true" />
          <span>{t("home.sheetRevealNote")}</span>
        </div>
      </div>
      <figcaption className="border-t border-border bg-muted px-5 py-2.5 text-xs text-muted-foreground">
        {t("home.sheetFootnote")}
      </figcaption>
    </figure>
  );
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-deep active:bg-primary-press"
    >
      {children}
      <ArrowRight
        className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
        strokeWidth={2}
        aria-hidden="true"
      />
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center rounded-md border border-border-strong bg-card px-5 text-base font-medium text-foreground transition-colors duration-150 hover:bg-muted"
    >
      {children}
    </Link>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="avs-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl leading-tight text-foreground sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const FEATURES = [
    { icon: Lock, title: t("home.feature1Title"), description: t("home.feature1Desc") },
    { icon: Vote, title: t("home.feature2Title"), description: t("home.feature2Desc") },
    { icon: Zap, title: t("home.feature3Title"), description: t("home.feature3Desc") },
    { icon: Dices, title: t("home.feature4Title"), description: t("home.feature4Desc") },
  ];

  const HOW_STEPS = [t("about.howStep1"), t("about.howStep2"), t("about.howStep3"), t("about.howStep4")];

  const FAQ_PREVIEW = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q6"), a: t("faq.a6") },
  ];

  // Below-the-fold sections only shift into place; they are never hidden
  // in the server HTML, so the page reads fine without JavaScript.
  const reveal = {
    initial: { y: reduceMotion ? 0 : 14 },
    whileInView: { y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
          <div>
            <p className="avs-rise avs-eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
              {t("home.badge")}
            </p>
            <h1
              className="avs-rise mt-5 text-[clamp(2.5rem,7.5vw,4.75rem)] leading-[1.02] text-foreground"
              style={{ animationDelay: "60ms" }}
            >
              {t("home.title")}
            </h1>
            <p
              className="avs-rise mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
              style={{ animationDelay: "120ms" }}
            >
              {t("home.subtitle")}
            </p>
            <div className="avs-rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "180ms" }}>
              <PrimaryCta href="/deals">{t("home.browseDeals")}</PrimaryCta>
              <SecondaryCta href="/dashboard">{t("home.myDashboard")}</SecondaryCta>
            </div>
          </div>

          <TermSheet />
        </div>
      </section>

      {/* Live figures */}
      <motion.section {...reveal} className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
        <StatsBand title={t("home.statsTitle")} note={t("home.statsNote")} />
      </motion.section>

      {/* Privacy model */}
      <motion.section {...reveal} className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeader eyebrow={t("home.featuresEyebrow")} title={t("home.featuresTitle")} />
          </div>
          <ol className="border-t border-border">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="grid grid-cols-[auto_1fr] gap-x-5 border-b border-border py-7">
                <span className="avs-icon-badge h-10 w-10">
                  <f.icon className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="flex items-baseline gap-3 text-lg text-foreground">
                    <span className="font-mono-avs text-xs text-muted-foreground">0{i + 1}</span>
                    {f.title}
                  </h3>
                  <p className="mt-2 max-w-prose text-base text-muted-foreground">{f.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </motion.section>

      {/* Process */}
      <motion.section {...reveal} className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <SectionHeader eyebrow={t("home.howEyebrow")} title={t("about.howTitle")} />
        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map((step, i) => (
            <li key={step} className="flex flex-col bg-card p-6">
              <span className="font-display text-4xl leading-none text-primary">{i + 1}</span>
              <p className="mt-5 text-base text-card-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </motion.section>

      {/* FAQ */}
      <motion.section {...reveal} className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <SectionHeader eyebrow={t("home.faqEyebrow")} title={t("faq.title")} subtitle={t("home.faqTeaserSubtitle")} />
            <Link
              href="/faq"
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-base font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("home.viewAllFaq")}
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          <div className="border-t border-border">
            {FAQ_PREVIEW.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 py-5 text-left"
                  >
                    <h3 className="text-lg text-foreground">{f.q}</h3>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border">
                      <motion.span
                        animate={reduceMotion ? undefined : { rotate: open ? 45 : 0 }}
                        transition={{ duration: 0.18 }}
                        className="flex"
                      >
                        <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
                      </motion.span>
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        animate={reduceMotion ? undefined : { height: "auto", opacity: 1 }}
                        exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-prose pb-6 text-base text-muted-foreground">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Closing call to action */}
      <motion.section {...reveal} className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <div className="grid gap-8 rounded-xl bg-ink px-6 py-10 text-ink-foreground sm:px-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-xl">
            <h2 className="text-3xl leading-tight sm:text-4xl">{t("home.ctaTitle")}</h2>
            <p className="mt-3 text-base opacity-80">{t("home.ctaSubtitle")}</p>
          </div>
          <Link
            href="/deals"
            className="inline-flex h-12 w-fit items-center gap-2 rounded-md bg-ink-foreground px-5 text-base font-medium text-ink transition-opacity duration-150 hover:opacity-90"
          >
            {t("home.browseDeals")}
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
