import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        "surface-elevated": "var(--surface-elevated)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        primary: "var(--primary)",
        "primary-deep": "var(--primary-deep)",
        "primary-press": "var(--primary-press)",
        "primary-subdued": "var(--primary-subdued)",
        "primary-foreground": "var(--primary-foreground)",
        accent: "var(--accent)",
        brass: "var(--brass)",
        "brass-subdued": "var(--brass-subdued)",
        ink: "var(--ink)",
        "ink-foreground": "var(--ink-foreground)",
        "border-strong": "var(--border-strong)",
        "accent-foreground": "var(--accent-foreground)",
        ring: "var(--ring)",
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        "2xl": "10px",
      },
      fontFamily: {
        heading: ["var(--font-display)", "Georgia", "serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
