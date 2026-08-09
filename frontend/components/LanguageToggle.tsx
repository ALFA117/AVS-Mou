"use client";

import { useState, useRef, useEffect } from "react";
import { Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LOCALES } from "@/lib/i18n";
import { useTranslation } from "@/lib/LanguageContext";

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("a11y.changeLanguage")}
        className="flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <Languages className="h-4 w-4" strokeWidth={2} />
        <span className="text-xs font-medium">{current.short}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="listbox"
            className="absolute right-0 top-full z-50 mt-2 min-w-36 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg"
          >
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={l.code === locale}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded px-3 py-2 text-left text-sm transition ${
                  l.code === locale
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {l.label}
                <span className="text-xs text-muted-foreground">{l.short}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
