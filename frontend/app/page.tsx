"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Vote, Zap, ShieldCheck } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useTranslation } from "@/lib/LanguageContext";

export default function Home() {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();

  const FEATURES = [
    { icon: Lock, title: t("home.feature1Title"), description: t("home.feature1Desc") },
    { icon: Vote, title: t("home.feature2Title"), description: t("home.feature2Desc") },
    { icon: Zap, title: t("home.feature3Title"), description: t("home.feature3Desc") },
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
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <AnimatedBackground />
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={item}
            className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            {t("home.badge")}
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-6xl"
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
                className="avs-glow-primary block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90"
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
                className="block rounded-lg border border-border bg-card/60 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition-colors duration-200 hover:bg-card"
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
        className="mx-auto max-w-5xl px-6 pb-24"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              whileHover={reduceMotion ? undefined : { y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="rounded-xl border border-border bg-card p-6 transition-shadow duration-200 hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-heading text-base font-semibold text-card-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </main>
  );
}
