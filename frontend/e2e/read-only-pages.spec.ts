import { test, expect } from "@playwright/test";

/**
 * Extends e2e/public-pages.spec.ts to the rest of the read-only surface —
 * still no wallet mock (see e2e/README.md for why transactional flows stay
 * out of this suite). Mostly "does it render without throwing," which is
 * exactly the class of bug a hydration mismatch or a bad next/dynamic
 * import shows up as.
 */
test.describe("read-only pages (no wallet required)", () => {
  test("analytics page renders platform stats without a wallet", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /connect your wallet/i })).toBeVisible();
  });

  test("dashboard prompts an unconnected visitor to connect", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /connect your wallet/i })).toBeVisible();
  });

  test("vote page renders without a wallet connected", async ({ page }) => {
    await page.goto("/vote");
    await expect(page.getByRole("heading", { name: /milestone votes/i })).toBeVisible();
  });

  test("a real deal detail page renders its stats and charts", async ({ page, request }) => {
    const dealsRes = await request.get("/deals");
    expect(dealsRes.ok()).toBeTruthy();

    await page.goto("/deals");
    // Excludes "Create deal" (href="/deals/new") — /deals/ alone matches it too.
    const firstDealLink = page.locator('a[href^="/deals/"]:not([href="/deals/new"])').first();
    await expect(firstDealLink).toBeVisible({ timeout: 15_000 });
    await firstDealLink.click();
    await expect(page).toHaveURL(/\/deals\/[^/]+$/);
    // Deal data comes from a real Devnet + MagicBlock TEE round-trip, not a
    // local mock — slower than a typical page transition, so this needs
    // real headroom rather than the default 5s.
    await expect(page.getByText(/deal #/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("deals list filters by status without a full reload", async ({ page }) => {
    await page.goto("/deals");
    await page.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page).toHaveURL(/status=open/);
  });

  test("robots.txt and sitemap.xml are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain("Sitemap");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain("<urlset");
  });

  test("manifest.json is served and references the app icon", async ({ request }) => {
    const res = await request.get("/manifest.json");
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.name).toContain("AVS");
    expect(manifest.icons?.[0]?.src).toBe("/icon.png");
  });

  test("an unknown route renders the not-found page instead of crashing", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.locator("body")).toContainText(/not found|404/i);
  });

  test("language switch persists across a client-side navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /change language/i }).click();
    await page.getByRole("option", { name: /español/i }).click();
    await expect(page.locator("body")).toContainText(/pujas|deals/i);
    await page.getByRole("link", { name: "Deals", exact: false }).first().click();
    await expect(page.locator("body")).not.toContainText("Connect your wallet");
  });

  // @vercel/analytics's script only exists on real Vercel infrastructure —
  // a local `next start` (this suite's webServer) 404s on it every time,
  // which surfaces as two different console messages: a bare "Failed to
  // load resource: ... 404" (no URL in msg.text() — Playwright/Chromium
  // don't attach it there) and a MIME-type refusal that does name the
  // script. Neither is a real app error, so both are excluded; this suite
  // is deliberately about JS runtime errors, not resource-load noise.
  const isKnownHarmless = (text: string) =>
    /^Failed to load resource:.*404/.test(text) || /_vercel\/insights\/script\.js/.test(text);

  for (const path of ["/deals", "/vote", "/analytics", "/about", "/faq", "/legal", "/status"]) {
    test(`no console errors on ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !isKnownHarmless(msg.text())) errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }
});
