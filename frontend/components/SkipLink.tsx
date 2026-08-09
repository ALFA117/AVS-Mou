"use client";

import { useTranslation } from "@/lib/LanguageContext";

/** Visually hidden until focused — lets keyboard/screen-reader users jump
 * past the nav (4 links + language/theme/wallet controls) straight to the
 * page content. */
export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
