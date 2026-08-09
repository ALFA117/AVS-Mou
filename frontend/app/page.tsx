"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Vote, Zap, ShieldCheck, Dices, ArrowRight } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DealsMockup } from "@/components/DealsMockup";
import { StatsBand } from "@/components/StatsBand";
import { useTranslation } from "@/lib/LanguageContext";

export default function Home() {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();

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

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 26 },
    },
  };

  return (
    <main>
      <section className="relative overflow-hidden px-6 py-16 sm:py-20 md:py-24">
        <AnimatedBackground />
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={item}
            className="mx-auto flex w-fit items-center gap-2 rounded-full bg-primary-subdued px-3 py-1 text-xs text-primary-deep"
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
            {t("home.badge")}
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-heading text-5xl font-light tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            {t("home.title")}
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            {t("home.subtitle")}
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap justify-center gap-3">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Link
                href="/deals"
                className="avs-glow-primary block rounded-full bg-primary px-6 py-2.5 text-base font-normal text-primary-foreground transition-colors duration-200 hover:bg-primary-deep"
              >
                {t("home.browseDeals")}
              </Link>
            </motion.div>
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Link
                href="/dashboard"
                className="block rounded-full border border-primary px-6 py-2.5 text-base font-normal text-primary transition-colors duration-200 hover:bg-primary-subdued"
              >
                {t("home.myDashboard")}
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={container}
        className="mx-auto max-w-5xl px-6 pb-16 sm:pb-20"
      >
        <motion.div variants={item} className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl">
            {t("home.mockupTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("home.mockupSubtitle")}</p>
        </motion.div>
        <motion.div variants={item} className="mt-8">
          <DealsMockup />
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={container}
        className="mx-auto max-w-5xl px-6 pb-16 sm:pb-20"
      >
        <motion.div variants={item}>
          <StatsBand title={t("home.statsTitle")} />
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={container}
        className="mx-auto max-w-5xl px-6 pb-16 sm:pb-24"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              whileHover={reduceMotion ? undefined : { y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="avs-elevate rounded-xl border border-border bg-card p-8"
            >
              <div className="avs-icon-badge h-9 w-9">
                <f.icon className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-heading text-lg font-light text-card-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={container}
        className="mx-auto max-w-3xl px-6 pb-20 sm:pb-28"
      >
        <motion.h2
          variants={item}
          className="text-center font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl"
        >
          {t("about.howTitle")}
        </motion.h2>
        <motion.ol variants={item} className="mt-8 space-y-4">
          {HOW_STEPS.map((step, i) => (
            <li key={step} className="avs-elevate flex gap-4 rounded-xl border border-border bg-card p-5">
              <span className="avs-icon-badge h-8 w-8 shrink-0 text-sm font-medium text-primary">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground">{step}</p>
            </li>
          ))}
        </motion.ol>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={container}
        className="mx-auto max-w-3xl px-6 pb-20 sm:pb-28"
      >
        <motion.div variants={item} className="text-center">
          <h2 className="font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl">
            {t("faq.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("home.faqTeaserSubtitle")}</p>
        </motion.div>
        <motion.div variants={item} className="mt-8 space-y-4">
          {FAQ_PREVIEW.map((f) => (
            <div key={f.q} className="avs-elevate rounded-xl border border-border bg-card p-5">
              <h3 className="font-heading text-base font-medium text-card-foreground">{f.q}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </motion.div>
        <motion.div variants={item} className="mt-6 text-center">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("home.viewAllFaq")}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={container}
        className="px-6 pb-24"
      >
        <motion.div
          variants={item}
          className="avs-glow-primary mx-auto max-w-3xl rounded-2xl border border-border bg-card px-8 py-12 text-center sm:px-12"
        >
          <h2 className="font-heading text-2xl font-light tracking-tight text-card-foreground sm:text-3xl">
            {t("home.ctaTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("home.ctaSubtitle")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Link
                href="/deals"
                className="block rounded-full bg-primary px-6 py-2.5 text-base font-normal text-primary-foreground transition-colors duration-200 hover:bg-primary-deep"
              >
                {t("home.browseDeals")}
              </Link>
            </motion.div>
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Link
                href="/dashboard"
                className="block rounded-full border border-primary px-6 py-2.5 text-base font-normal text-primary transition-colors duration-200 hover:bg-primary-subdued"
              >
                {t("home.myDashboard")}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>
    </main>
  );
}
