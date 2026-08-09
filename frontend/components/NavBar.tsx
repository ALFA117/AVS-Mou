"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "@/lib/LanguageContext";

export function NavBar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const LINKS = [
    { href: "/deals", label: t("nav.deals") },
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/vote", label: t("nav.vote") },
    { href: "/analytics", label: t("nav.analytics") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading font-semibold tracking-tight text-foreground"
        >
          <motion.span
            className="avs-icon-badge avs-glow-primary h-8 w-8"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Lock className="h-4 w-4 text-primary" strokeWidth={2.25} />
          </motion.span>
          AVS
        </Link>
        <nav className="relative flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3 py-2 transition-colors duration-200 ${
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-primary/10"
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
        </div>
      </div>
    </header>
  );
}
