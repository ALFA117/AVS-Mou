"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, dictionaries, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "avs.locale";

function getNested(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function defaultTranslate(key: string, vars?: Record<string, string | number>): string {
  const value = getNested(dictionaries[DEFAULT_LOCALE], key);
  return typeof value === "string" ? interpolate(value, vars) : key;
}

// Defaults to the base locale rather than requiring a Provider — keeps
// isolated component tests (render() with no wrapper) working without
// forcing every test file to know about i18n.
const LanguageContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: TranslateFn }>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: defaultTranslate,
});

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const lang = navigator.language.slice(0, 2).toLowerCase();
  if (lang === "es") return "es";
  if (lang === "pt") return "pt";
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    setLocaleState(stored && stored in dictionaries ? stored : detectBrowserLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const value = getNested(dictionaries[locale], key) ?? getNested(dictionaries[DEFAULT_LOCALE], key);
      if (typeof value !== "string") return key;
      return interpolate(value, vars);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}
