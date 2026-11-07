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
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-12 text-sm text-muted-foreground">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-11 items-center px-1 transition-colors duration-200 hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
