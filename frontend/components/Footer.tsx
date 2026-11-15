"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/LanguageContext";

export function Footer() {
  const { t } = useTranslation();

  const LINKS = [
    { href: "/about", label: t("footer.about") },
    { href: "/faq", label: t("footer.faq") },
    { href: "/legal", label: t("footer.legal") },
    { href: "/status", label: t("footer.status") },
    { href: "/settings", label: t("footer.settings") },
  ];

  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="max-w-md">
          <p className="font-display text-xl text-foreground">Anonymous Venture Syndicate</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("nav.devnetBadgeTitle")}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
