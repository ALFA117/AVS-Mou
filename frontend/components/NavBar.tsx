"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "@/lib/LanguageContext";

export function NavBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const LINKS = [
    { href: "/deals", label: t("nav.deals") },
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/vote", label: t("nav.vote") },
    { href: "/analytics", label: t("nav.analytics") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="AVS — Anonymous Venture Syndicate"
          className="flex min-h-11 items-center gap-2.5 text-foreground"
        >
          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border">
            <Image src="/avs-logo-mark.jpg" alt="" fill sizes="32px" className="object-cover" priority />
          </span>
          <span className="font-display text-xl font-medium leading-none tracking-tight">AVS</span>
          <span
            title={t("nav.devnetBadgeTitle")}
            className="hidden shrink-0 items-center gap-1.5 rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono-avs text-[11px] font-medium uppercase tracking-wider text-amber-900 min-[360px]:inline-flex dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            {t("nav.devnetBadge")}
          </span>
        </Link>

        {/* Desktop nav — collapses behind the hamburger below `md` */}
        <nav className="relative hidden items-center text-sm md:flex">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 items-center px-3 transition-colors duration-200 ${
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-x-3 bottom-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <WalletConnectButton />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground md:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mobileOpen ? "close" : "open"}
                initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex"
              >
                {mobileOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile menu — the 4 page links only; language/theme/wallet stay in
          the top row since they're compact icon controls, not the thing
          overflowing on narrow viewports. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="border-t border-border bg-background px-4 py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {LINKS.map((link) => {
                const active = pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center border-l-2 px-3 text-base transition-colors duration-200 ${
                      active
                        ? "border-primary bg-muted font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
