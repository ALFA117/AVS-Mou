"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { applyTheme, getStoredTheme, systemTheme, type Theme } from "@/lib/theme";
import { useTranslation } from "@/lib/LanguageContext";

export function ThemeToggle() {
  const { t } = useTranslation();
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
    <motion.button
      type="button"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      aria-label={t("a11y.toggleDarkMode")}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={2} />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
