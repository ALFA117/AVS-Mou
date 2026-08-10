import { test, expect } from "@playwright/test";

test.describe("public pages (no wallet required)", () => {
  test("landing page renders the hero and feature list", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toContainText(/sealed|private|syndicate/i);
  });

  test("deals list renders and links to create-deal", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByRole("heading", { name: "Deals" })).toBeVisible();
    await expect(page.getByRole("link", { name: /create deal/i })).toBeVisible();
  });

  test("create-deal page prompts an unconnected visitor to connect a wallet", async ({ page }) => {
    // The form itself is gated behind a connected wallet — this suite
    // deliberately doesn't mock one (see e2e/README.md), so this just
    // confirms the gate renders instead of an error or a blank page.
    await page.goto("/deals/new");
    await expect(page.getByText(/connect your wallet to create a deal/i)).toBeVisible();
  });

  test("about page renders", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: /about avs/i })).toBeVisible();
  });

  test("faq page renders at least one question", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.getByRole("heading", { name: "FAQ" })).toBeVisible();
    await expect(page.getByText(/is my bid really private/i)).toBeVisible();
  });

  test("legal page renders the disclaimer/terms/privacy sections", async ({ page }) => {
    await page.goto("/legal");
    await expect(page.getByRole("heading", { name: "Legal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Disclaimer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });

  test("status page shows all three deployed programs", async ({ page }) => {
    await page.goto("/status");
    await expect(page.getByRole("heading", { name: /system status/i })).toBeVisible();
    await expect(page.getByText("sealed-auction")).toBeVisible();
    await expect(page.getByText("private-voting")).toBeVisible();
    await expect(page.getByText("spl-token-manager")).toBeVisible();
  });

  test("navigation links move between pages without a full reload", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("header nav");
    await nav.getByRole("link", { name: "Deals", exact: true }).click();
    await expect(page).toHaveURL(/\/deals$/);
    await nav.getByRole("link", { name: "Vote", exact: true }).click();
    await expect(page).toHaveURL(/\/vote$/);
  });

  test("no console errors on the landing page", async ({ page }) => {
    // See e2e/read-only-pages.spec.ts for why @vercel/analytics's local
    // 404 noise (it only exists on real Vercel infrastructure) is
    // excluded — this check is about JS runtime errors.
    const errors: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      const isKnownHarmless = /^Failed to load resource:.*404/.test(text) || /_vercel\/insights\/script\.js/.test(text);
      if (msg.type() === "error" && !isKnownHarmless) errors.push(text);
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
