"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
        <Link href="/" className="font-heading font-semibold tracking-tight text-foreground">
          <motion.span
            className="inline-block"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            AVS
          </motion.span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "relative border-b-2 border-primary font-medium text-foreground"
                    : "relative border-b-2 border-transparent text-muted-foreground transition-colors duration-200 hover:text-foreground"
                }
              >
                {link.label}
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
