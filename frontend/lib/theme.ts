/**
 * Task 083 scope note: the toggle, persistence, and global background/
 * foreground (globals.css) + NavBar are fully dark-mode-aware. Card-level
 * components (border-neutral-200, bg-neutral-50/100, etc.) don't yet carry
 * `dark:` variants — a bulk find/replace risked corrupting conditional
 * `hover:`/ternary class strings (e.g. turning `hover:bg-neutral-50` into
 * an always-on dark background). Left as follow-up polish rather than
 * risking a broad, hard-to-review change.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "avs.theme";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
