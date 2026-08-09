import type { MetadataRoute } from "next";

const BASE_URL = "https://avs-mou.vercel.app";

// Only static, publicly meaningful routes — dashboard/vote/settings are
// wallet-scoped views with nothing to index, and per-deal pages
// (deals/[id], syndicates/[id]) would need a data fetch here to enumerate,
// which isn't worth it for a devnet demo's crawl budget.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/deals", "/analytics", "/about", "/faq", "/legal", "/status"];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/deals" ? "hourly" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
