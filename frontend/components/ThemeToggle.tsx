"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, systemTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getStoredTheme() ?? systemTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  // Avoid a hydration flash: render nothing until we know the real theme.
  if (!mounted) return <div className="h-8 w-8" />;

  return (
    <button
      type="button"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      aria-label="Toggle dark mode"
      className="flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
