"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Vote, Zap, ShieldCheck } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const FEATURES = [
  {
    icon: Lock,
    title: "Sealed bids",
    description:
      "Amounts are hidden by an on-chain access-control permission — not client-side encryption — invisible to everyone, including the startup, until reveal.",
  },
  {
    icon: Vote,
    title: "Private milestone votes",
    description:
      "Syndicate members vote YES/NO in secret. Outcomes reveal simultaneously, and rewards settle only once verifiable randomness gates payout.",
  },
  {
    icon: Zap,
    title: "Gasless, one-tap signing",
    description:
      "Session keys let you bid and vote without a wallet popup per action, running on MagicBlock's Ephemeral Rollups at ~10ms latency.",
  },
];

export default function Home() {
  const reduceMotion = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
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
            Built on MagicBlock Ephemeral Rollups
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-6xl"
          >
            Anonymous Venture Syndicate
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Sealed-bid deal syndicates on Solana. Bid or vote in secret — everyone reveals at
            once.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/deals"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 transition hover:opacity-90"
            >
              Browse Deals
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-border bg-card/60 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition hover:bg-card"
            >
              My Dashboard
            </Link>
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
              className="rounded-xl border border-border bg-card p-6"
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
