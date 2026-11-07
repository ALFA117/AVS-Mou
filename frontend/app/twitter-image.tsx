import OgImage from "./opengraph-image";

// Same card for X/Twitter's summary_large_image. The config exports are
// repeated (not re-exported) because Next reads them statically per file.
export const alt = "AVS — Anonymous Venture Syndicate: sealed-bid deal syndicates on Solana devnet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered per request instead of prerendered at build: @vercel/og's
// prerender step crashes on Windows paths (fileURLToPath) in local builds.
export const dynamic = "force-dynamic";

export default function Image() {
  return OgImage();
}
