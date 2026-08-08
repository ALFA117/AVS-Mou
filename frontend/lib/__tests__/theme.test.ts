import { describe, it, expect, beforeEach } from "vitest";
import { getStoredTheme, applyTheme, systemTheme } from "@/lib/theme";

describe("theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("getStoredTheme returns null when nothing has been saved yet", () => {
    expect(getStoredTheme()).toBeNull();
  });

  it("applyTheme persists the choice and toggles the <html> class", () => {
    applyTheme("dark");
    expect(getStoredTheme()).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    applyTheme("light");
    expect(getStoredTheme()).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("systemTheme reflects prefers-color-scheme without throwing in jsdom", () => {
    // jsdom's matchMedia always reports no-match unless mocked — just assert
    // it returns a valid Theme value rather than asserting a specific one.
    expect(["light", "dark"]).toContain(systemTheme());
  });
});
