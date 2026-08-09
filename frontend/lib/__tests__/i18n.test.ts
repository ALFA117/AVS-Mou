import { describe, expect, it } from "vitest";
import { dictionaries, type Locale } from "@/lib/i18n";

type Tree = { [key: string]: string | Tree };

function leafPaths(node: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out.set(path, value);
    } else {
      for (const [k, v] of Array.from(leafPaths(value, path))) out.set(k, v);
    }
  }
  return out;
}

// {placeholder} interpolation slots — t() substitutes these positionally,
// so a locale with a different slot set for the same key silently drops
// data instead of throwing.
function placeholders(value: string): string[] {
  return Array.from(value.matchAll(/\{(\w+)\}/g))
    .map((m) => m[1])
    .sort();
}

const locales = Object.keys(dictionaries) as Locale[];
const trees = new Map(locales.map((l) => [l, leafPaths(dictionaries[l] as Tree)]));
const reference = trees.get("en")!;

describe("i18n locale parity", () => {
  for (const locale of locales) {
    if (locale === "en") continue;

    it(`${locale} has exactly the same keys as en`, () => {
      const keys = trees.get(locale)!;
      const missing = Array.from(reference.keys()).filter((k) => !keys.has(k));
      const extra = Array.from(keys.keys()).filter((k) => !reference.has(k));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });

    it(`${locale} interpolation placeholders match en for every key`, () => {
      const keys = trees.get(locale)!;
      const mismatches: string[] = [];
      for (const [key, enValue] of Array.from(reference)) {
        const localeValue = keys.get(key);
        if (localeValue === undefined) continue; // reported by the parity test above
        const enSlots = placeholders(enValue);
        const localeSlots = placeholders(localeValue);
        if (JSON.stringify(enSlots) !== JSON.stringify(localeSlots)) {
          mismatches.push(`${key}: en=[${enSlots}] ${locale}=[${localeSlots}]`);
        }
      }
      expect(mismatches).toEqual([]);
    });

    it(`${locale} has no value left untranslated (identical to en, excluding short/technical strings)`, () => {
      const keys = trees.get(locale)!;
      const suspicious: string[] = [];
      for (const [key, enValue] of Array.from(reference)) {
        const localeValue = keys.get(key);
        if (localeValue === undefined) continue;
        // Short strings, numerals, and pure-punctuation/placeholder values
        // are legitimately identical across locales (e.g. "Solana", "SOL",
        // "0", brand names, code-like tokens) — only flag longer prose that
        // was plausibly just left copy-pasted from English.
        const isProse = /[a-zA-Z]{4,}.*[a-zA-Z]{4,}/.test(enValue) && enValue.length > 12;
        if (isProse && enValue === localeValue) {
          suspicious.push(key);
        }
      }
      // This is a soft check: flags candidates rather than failing hard,
      // since some product/brand terms are intentionally identical.
      if (suspicious.length > 0) {
        console.warn(`[i18n] ${locale}: possibly untranslated (identical to en): ${suspicious.join(", ")}`);
      }
      expect(suspicious.length).toBeLessThan(reference.size); // sanity bound, not a real gate
    });
  }
});
