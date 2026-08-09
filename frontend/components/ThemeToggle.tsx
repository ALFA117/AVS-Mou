"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
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
  if (!mounted) return <div className="h-11 w-11" />;

  return (
    <button
      type="button"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      aria-label="Toggle dark mode"
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" strokeWidth={2} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2} />
      )}
    </button>
  );
}
